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
    /// The fingerprint of the install this store belongs to. The store never
    /// holds an entry for it: a device trusting itself is meaningless, and it
    /// makes fingerprint-keyed routing and the glare tiebreak degenerate.
    own_fingerprint: String,
    devices: Mutex<HashMap<String, TrustedDevice>>, // keyed by fingerprint
}

impl TrustStore {
    /// Open (or create empty) the trust store in `dir`, owned by the install
    /// whose identity fingerprints to `own_fingerprint`. A missing file is not
    /// an error — a fresh install trusts nobody. An entry for the owner itself
    /// is dropped on the way in (an older build could write one) and the
    /// cleaned store is persisted, so the file on disk stops carrying it.
    pub fn load(dir: &std::path::Path, own_fingerprint: &str) -> Result<TrustStore, String> {
        std::fs::create_dir_all(dir).map_err(|e| format!("creating trust dir: {e}"))?;
        let path = dir.join(TRUST_FILE);
        let mut devices = HashMap::new();
        let mut purged = false;
        match std::fs::read(&path) {
            Ok(data) => {
                let list: Vec<TrustedDevice> = serde_json::from_slice(&data)
                    .map_err(|e| format!("parsing trust store: {e}"))?;
                for d in list {
                    let fp = d.fingerprint();
                    if fp == own_fingerprint {
                        purged = true;
                        continue;
                    }
                    devices.insert(fp, d);
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(format!("reading trust store: {e}")),
        }
        let store = TrustStore {
            path: Some(path),
            own_fingerprint: own_fingerprint.to_string(),
            devices: Mutex::new(devices),
        };
        // Only rewrite when there was something to drop, so a clean start does
        // not touch the file.
        if purged {
            tracing::warn!("pairing: dropped this device's own entry from the trust store");
            store.save()?;
        }
        Ok(store)
    }

    /// A non-persistent store for tests. The owner fingerprint is empty, which
    /// no real fingerprint can equal (they are 64 hex chars), so the self-add
    /// guard never fires — use `in_memory_owned_by` to exercise it.
    #[cfg(test)]
    pub fn in_memory() -> TrustStore {
        TrustStore {
            path: None,
            own_fingerprint: String::new(),
            devices: Mutex::new(HashMap::new()),
        }
    }

    /// A non-persistent store belonging to `own_fingerprint`, for testing the
    /// self-add guard.
    #[cfg(test)]
    pub fn in_memory_owned_by(own_fingerprint: &str) -> TrustStore {
        TrustStore {
            path: None,
            own_fingerprint: own_fingerprint.to_string(),
            devices: Mutex::new(HashMap::new()),
        }
    }

    /// Record a trusted device under the self-name it advertised, or refresh
    /// that advertised name if it is already trusted. A re-add keeps any local
    /// override the user set. Persists.
    ///
    /// Adding this install's own identity is refused. This is the single
    /// backstop for that invariant — callers check earlier only to fail fast
    /// and word the error, never instead of this.
    pub fn add(&self, key: PublicKey, advertised_name: &str) -> Result<(), String> {
        {
            let mut devices = self.devices.lock().unwrap();
            let fp = key.fingerprint();
            if fp == self.own_fingerprint {
                return Err("that is this device's own identity".into());
            }
            let advertised = advertised_name.trim().to_string();
            devices.entry(fp).and_modify(|d| d.advertised_name = advertised.clone()).or_insert(
                TrustedDevice { key, advertised_name: advertised, local_override: None },
            );
        }
        self.save()
    }

    /// Refresh a trusted device's advertised self-name (e.g. from an incoming
    /// offer). A device with a local override is left untouched so the user's
    /// chosen name wins. Unknown fingerprints are ignored. Persists on a change.
    pub fn refresh_advertised(
        &self,
        fingerprint: &str,
        advertised_name: &str,
    ) -> Result<(), String> {
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
        let blob =
            serde_json::to_vec_pretty(&list).map_err(|e| format!("marshaling trust store: {e}"))?;
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
            let store = TrustStore::load(dir.path(), "me").unwrap();
            store.add(peer.clone(), "laptop").unwrap();
            assert!(store.trusted(&peer));
            assert_eq!(store.get(&fp).unwrap().label(), "laptop");
        }
        // Reload from disk: the trust survived.
        let store = TrustStore::load(dir.path(), "me").unwrap();
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

    /// A device trusting itself is meaningless, and the store is the one place
    /// that has to refuse it no matter which caller asks.
    #[test]
    fn own_identity_cannot_be_added() {
        let me = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap().public();
        let fp = me.fingerprint();
        let store = TrustStore::in_memory_owned_by(&fp);
        assert!(store.add(me.clone(), "myself").is_err());
        // Nothing was recorded on the way out.
        assert!(!store.trusted(&me));
        assert!(store.get(&fp).is_none());
        assert!(store.list().is_empty());
    }

    #[test]
    fn peers_still_add_when_owner_is_set() {
        let me = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap().public();
        let peer = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap().public();
        let store = TrustStore::in_memory_owned_by(&me.fingerprint());
        store.add(peer.clone(), "laptop").unwrap();
        assert!(store.trusted(&peer));
    }

    /// An older build could persist a self-entry; loading drops it and rewrites
    /// the file, leaving genuine peers (and their overrides) untouched.
    #[test]
    fn self_entry_purged_on_load_leaving_peers() {
        let dir = tempfile::tempdir().unwrap();
        let me = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap().public();
        let peer = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap().public();
        let my_fp = me.fingerprint();
        let peer_fp = peer.fingerprint();

        // Seed a store that predates the guard: it holds both.
        {
            let store = TrustStore::load(dir.path(), "someone-else").unwrap();
            store.add(me.clone(), "myself").unwrap();
            store.add(peer.clone(), "NicoPC").unwrap();
            store.rename(&peer_fp, "Work PC").unwrap();
        }

        let store = TrustStore::load(dir.path(), &my_fp).unwrap();
        assert!(!store.trusted(&me));
        assert!(store.trusted(&peer));
        assert_eq!(store.get(&peer_fp).unwrap().label(), "Work PC");

        // The purge was written through, so a later load sees the clean file
        // even without the guard re-firing.
        let reloaded = TrustStore::load(dir.path(), "someone-else").unwrap();
        assert!(!reloaded.trusted(&me));
        assert!(reloaded.trusted(&peer));
        assert_eq!(reloaded.get(&peer_fp).unwrap().local_override.as_deref(), Some("Work PC"));
    }

    /// Nothing to purge means the file is left exactly as it was.
    #[test]
    fn clean_load_does_not_rewrite() {
        let dir = tempfile::tempdir().unwrap();
        let peer = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap().public();
        let me = Identity::load_or_create(tempfile::tempdir().unwrap().path()).unwrap().public();
        {
            let store = TrustStore::load(dir.path(), &me.fingerprint()).unwrap();
            store.add(peer.clone(), "laptop").unwrap();
        }
        let path = dir.path().join(TRUST_FILE);
        let before = std::fs::metadata(&path).unwrap().modified().unwrap();
        let store = TrustStore::load(dir.path(), &me.fingerprint()).unwrap();
        assert!(store.trusted(&peer));
        assert_eq!(std::fs::metadata(&path).unwrap().modified().unwrap(), before);
    }
}
