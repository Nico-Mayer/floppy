// The set of devices this install trusts, backed by a JSON file. Ported from
// the Go `pairing.TrustStore`: every mutation persists immediately (atomic
// write) so on-disk state always matches memory. Interior-locked for concurrent
// use by the pairing commands and signal tasks.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use crate::pairing::identity::{write_file_atomic, PublicKey};

/// One trust-store entry: a peer's public identity plus a human name.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustedDevice {
    pub key: PublicKey,
    pub name: String,
}

impl TrustedDevice {
    pub fn fingerprint(&self) -> String {
        self.key.fingerprint()
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

    /// Record (or rename) a trusted device and persist.
    pub fn add(&self, key: PublicKey, name: &str) -> Result<(), String> {
        {
            let mut devices = self.devices.lock().unwrap();
            let fp = key.fingerprint();
            devices.insert(fp.clone(), TrustedDevice { name: normalize_name(name, &key), key });
        }
        self.save()
    }

    /// Rename a trusted device and persist. Unknown fingerprint is an error so
    /// the UI can tell a rename of a device that was un-trusted underneath it.
    pub fn rename(&self, fingerprint: &str, name: &str) -> Result<(), String> {
        {
            let mut devices = self.devices.lock().unwrap();
            let device = devices.get_mut(fingerprint).ok_or("no such trusted device")?;
            device.name = normalize_name(name, &device.key);
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

/// Trim a pairing display name; empty falls back to a fingerprint prefix so a
/// device is never nameless in the UI.
pub fn normalize_name(name: &str, key: &PublicKey) -> String {
    let n = name.trim();
    if !n.is_empty() {
        n.to_string()
    } else {
        format!("device-{}", &key.fingerprint()[..8])
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
            assert_eq!(store.get(&fp).unwrap().name, "laptop");
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
        assert!(store.get(&peer.fingerprint()).unwrap().name.starts_with("device-"));
    }
}
