// The set of devices this install trusts, backed by a JSON file. Ported from
// the Go `pairing.TrustStore`: every mutation persists immediately (atomic
// write) so on-disk state always matches memory. Interior-locked for concurrent
// use by the pairing commands and signal tasks.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use crate::pairing::identity::{write_file_atomic, PublicKey};

/// One trust-store entry: a peer's public identity, the self-name it last
/// advertised, and an optional local override the user set on this device.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustedDevice {
    pub key: PublicKey,
    /// The peer's most-recently-advertised self-name.
    pub advertised_name: String,
    /// A local rename. When set it wins over the advertised name and is never
    /// sent to the peer.
    #[serde(default)]
    pub local_override: Option<String>,
}

impl TrustedDevice {
    pub fn fingerprint(&self) -> String {
        self.key.fingerprint()
    }

    /// The name to show: local override wins, then the advertised self-name,
    /// then a fingerprint-derived fallback so a device is never nameless.
    pub fn label(&self) -> String {
        if let Some(o) = &self.local_override {
            let o = o.trim();
            if !o.is_empty() {
                return o.to_string();
            }
        }
        let advertised = self.advertised_name.trim();
        if !advertised.is_empty() {
            advertised.to_string()
        } else {
            format!("device-{}", &self.fingerprint()[..8])
        }
    }
}

const TRUST_FILE: &str = "trust.json";

pub struct TrustStore {
    path: Option<PathBuf>,
    devices: Mutex<HashMap<String, TrustedDevice>>, // keyed by fingerprint
}

impl TrustStore {
    /// Open (or create empty) the trust store in `dir`. A missing file is not an
    /// error — a fresh install trusts nobody.
    pub fn load(dir: &std::path::Path) -> Result<TrustStore, String> {
        std::fs::create_dir_all(dir).map_err(|e| format!("creating trust dir: {e}"))?;
        let path = dir.join(TRUST_FILE);
        let mut devices = HashMap::new();
        match std::fs::read(&path) {
            Ok(data) => {
                let list: Vec<TrustedDevice> =
                    serde_json::from_slice(&data).map_err(|e| format!("parsing trust store: {e}"))?;
                for d in list {
                    devices.insert(d.fingerprint(), d);
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(format!("reading trust store: {e}")),
        }
        Ok(TrustStore { path: Some(path), devices: Mutex::new(devices) })
    }

    /// A non-persistent store for tests.
    #[cfg(test)]
    pub fn in_memory() -> TrustStore {
        TrustStore { path: None, devices: Mutex::new(HashMap::new()) }
    }

    /// Record a trusted device under the self-name it advertised, or refresh
    /// that advertised name if it is already trusted. A re-add keeps any local
    /// override the user set. Persists.
    pub fn add(&self, key: PublicKey, advertised_name: &str) -> Result<(), String> {
        {
            let mut devices = self.devices.lock().unwrap();
            let fp = key.fingerprint();
            let advertised = advertised_name.trim().to_string();
            devices
                .entry(fp)
                .and_modify(|d| d.advertised_name = advertised.clone())
                .or_insert(TrustedDevice { key, advertised_name: advertised, local_override: None });
        }
        self.save()
    }

    /// Refresh a trusted device's advertised self-name (e.g. from an incoming
    /// offer). A device with a local override is left untouched so the user's
    /// chosen name wins. Unknown fingerprints are ignored. Persists on a change.
    pub fn refresh_advertised(&self, fingerprint: &str, advertised_name: &str) -> Result<(), String> {
        {
            let mut devices = self.devices.lock().unwrap();
            let Some(device) = devices.get_mut(fingerprint) else { return Ok(()) };
            let next = advertised_name.trim();
            if device.local_override.is_some() || device.advertised_name == next {
                return Ok(());
            }
            device.advertised_name = next.to_string();
        }
        self.save()
    }

    /// Set or clear a device's local override name. An empty name clears the
    /// override, letting the advertised self-name show through. Unknown
    /// fingerprint is an error so the UI can tell a rename of a device that was
    /// un-trusted underneath it. Persists.
    pub fn rename(&self, fingerprint: &str, name: &str) -> Result<(), String> {
        {
            let mut devices = self.devices.lock().unwrap();
            let device = devices.get_mut(fingerprint).ok_or("no such trusted device")?;
            let n = name.trim();
            device.local_override = if n.is_empty() { None } else { Some(n.to_string()) };
        }
        self.save()
    }

    /// Un-trust a device by fingerprint and persist. Unknown fingerprint is a
    /// no-op (still persists — keeps the call idempotent).
    pub fn remove(&self, fingerprint: &str) -> Result<(), String> {
        self.devices.lock().unwrap().remove(fingerprint);
        self.save()
    }

    /// The trusted device for a fingerprint, if any.
    pub fn get(&self, fingerprint: &str) -> Option<TrustedDevice> {
        self.devices.lock().unwrap().get(fingerprint).cloned()
    }

    /// Whether a public key belongs to a trusted device.
    pub fn trusted(&self, key: &PublicKey) -> bool {
        self.devices.lock().unwrap().contains_key(&key.fingerprint())
    }

    /// All trusted devices, in no particular order.
    pub fn list(&self) -> Vec<TrustedDevice> {
        self.devices.lock().unwrap().values().cloned().collect()
    }

    fn save(&self) -> Result<(), String> {
        let Some(path) = &self.path else { return Ok(()) };
        let list: Vec<TrustedDevice> = self.devices.lock().unwrap().values().cloned().collect();
        let blob = serde_json::to_vec_pretty(&list).map_err(|e| format!("marshaling trust store: {e}"))?;
        write_file_atomic(path, &blob).map_err(|e| format!("writing trust store: {e}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pairing::identity::Identity;

    #[test]
    fn add_get_remove_persist() {
        let dir = tempfile::tempdir().unwrap();
        let peer = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap().public();
        let fp = peer.fingerprint();
        {
            let store = TrustStore::load(dir.path()).unwrap();
            store.add(peer.clone(), "laptop").unwrap();
            assert!(store.trusted(&peer));
            assert_eq!(store.get(&fp).unwrap().label(), "laptop");
        }
        // Reload from disk: the trust survived.
        let store = TrustStore::load(dir.path()).unwrap();
        assert!(store.trusted(&peer));
        store.remove(&fp).unwrap();
        assert!(!store.trusted(&peer));
    }

    #[test]
    fn empty_name_falls_back_to_fingerprint() {
        let peer = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap().public();
        let store = TrustStore::in_memory();
        store.add(peer.clone(), "   ").unwrap();
        assert!(store.get(&peer.fingerprint()).unwrap().label().starts_with("device-"));
    }

    #[test]
    fn local_override_wins_and_survives_refresh() {
        let peer = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap().public();
        let fp = peer.fingerprint();
        let store = TrustStore::in_memory();
        store.add(peer.clone(), "NicoPC").unwrap();
        store.rename(&fp, "Work PC").unwrap();
        assert_eq!(store.get(&fp).unwrap().label(), "Work PC");
        // A later advertised name does not disturb the override.
        store.refresh_advertised(&fp, "NicoDesktop").unwrap();
        assert_eq!(store.get(&fp).unwrap().label(), "Work PC");
        // Clearing the override falls back to the advertised name (unchanged,
        // since refresh skipped the overridden entry).
        store.rename(&fp, "  ").unwrap();
        assert_eq!(store.get(&fp).unwrap().label(), "NicoPC");
    }

    #[test]
    fn refresh_updates_advertised_without_override() {
        let peer = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap().public();
        let fp = peer.fingerprint();
        let store = TrustStore::in_memory();
        store.add(peer.clone(), "NicoPC").unwrap();
        store.refresh_advertised(&fp, "NicoDesktop").unwrap();
        assert_eq!(store.get(&fp).unwrap().label(), "NicoDesktop");
    }
}
