// This install's friendly self-name: one persisted label the device shows to
// peers. Generated once on first run as a random adjective-animal combo (e.g.
// "brave-otter"), editable by the user, and never derived from the OS hostname
// (a generated label leaks nothing, which fits a no-cloud app). Advertised
// during pairing and on every transfer offer; the peer keeps its own copy.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use crate::pairing::identity::write_file_atomic;

const SELF_NAME_FILE: &str = "self_name.json";

#[derive(Serialize, Deserialize)]
struct Disk {
    name: String,
}

/// The device's own display name. Interior-locked so the pairing commands and
/// signal tasks can read it while the user edits it.
pub struct SelfName {
    path: Option<PathBuf>,
    name: Mutex<String>,
}

impl SelfName {
    /// Load the stored self-name from `dir`, generating and persisting a fresh
    /// one on first run. A present-but-blank stored name is treated as missing.
    pub fn load_or_create(dir: &Path) -> Result<SelfName, String> {
        std::fs::create_dir_all(dir).map_err(|e| format!("creating self-name dir: {e}"))?;
        let path = dir.join(SELF_NAME_FILE);
        match std::fs::read(&path) {
            Ok(data) => {
                let disk: Disk =
                    serde_json::from_slice(&data).map_err(|e| format!("parsing self-name: {e}"))?;
                if !disk.name.trim().is_empty() {
                    return Ok(SelfName { path: Some(path), name: Mutex::new(disk.name) });
                }
                // Blank on disk — regenerate and persist so it is stable hereafter.
                let s = SelfName { path: Some(path), name: Mutex::new(generate()?) };
                s.save()?;
                Ok(s)
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                let s = SelfName { path: Some(path), name: Mutex::new(generate()?) };
                s.save()?;
                Ok(s)
            }
            Err(e) => Err(format!("reading self-name: {e}")),
        }
    }

    /// A fixed, non-persistent self-name for tests.
    #[cfg(test)]
    pub fn fixed(name: &str) -> SelfName {
        SelfName { path: None, name: Mutex::new(name.to_string()) }
    }

    /// The current self-name.
    pub fn get(&self) -> String {
        self.name.lock().unwrap().clone()
    }

    /// Set and persist a new self-name. Rejects an empty name so a device is
    /// never nameless to its peers.
    pub fn set(&self, name: &str) -> Result<(), String> {
        let n = name.trim();
        if n.is_empty() {
            return Err("a device name cannot be empty".into());
        }
        *self.name.lock().unwrap() = n.to_string();
        self.save()
    }

    fn save(&self) -> Result<(), String> {
        let Some(path) = &self.path else { return Ok(()) };
        let disk = Disk { name: self.name.lock().unwrap().clone() };
        let blob = serde_json::to_vec(&disk).map_err(|e| format!("marshaling self-name: {e}"))?;
        write_file_atomic(path, &blob).map_err(|e| format!("writing self-name: {e}"))
    }
}

// Small, friendly, non-identifying wordlists. Kept short on purpose — this is a
// default label, not a secret, so a few hundred combinations is plenty and the
// results stay readable.
const ADJECTIVES: &[&str] = &[
    "brave", "calm", "clever", "cosy", "eager", "fuzzy", "gentle", "happy", "jolly", "kind",
    "lucky", "mellow", "merry", "nimble", "plucky", "quiet", "shiny", "snug", "spry", "sunny",
    "swift", "tidy", "witty", "zippy", "bold", "bright", "chill", "dapper", "peppy", "wise",
];

const ANIMALS: &[&str] = &[
    "otter", "panda", "koala", "fox", "lynx", "heron", "finch", "gecko", "moth", "wren", "seal",
    "hare", "newt", "crane", "robin", "bison", "tapir", "quail", "swan", "vole", "puffin",
    "badger", "marten", "beaver", "ferret", "raven", "mole", "shrew", "stoat", "wombat",
];

/// A random `AdjectiveAnimal` self-name in PascalCase, e.g. `BraveOtter`.
pub fn generate() -> Result<String, String> {
    let mut buf = [0u8; 2];
    getrandom::fill(&mut buf).map_err(|e| format!("rng: {e}"))?;
    let adjective = ADJECTIVES[buf[0] as usize % ADJECTIVES.len()];
    let animal = ANIMALS[buf[1] as usize % ANIMALS.len()];
    Ok(format!("{}{}", capitalize(adjective), capitalize(animal)))
}

/// Uppercase the first letter of a lowercase wordlist entry.
fn capitalize(word: &str) -> String {
    let mut chars = word.chars();
    match chars.next() {
        Some(first) => first.to_ascii_uppercase().to_string() + chars.as_str(),
        None => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generated_once_and_stable_across_restart() {
        let dir = tempfile::tempdir().unwrap();
        let first = SelfName::load_or_create(dir.path()).unwrap().get();
        assert!(
            first.chars().next().is_some_and(|c| c.is_ascii_uppercase()),
            "generated name is PascalCase (e.g. BraveOtter)"
        );
        // A second load against the same dir yields the identical name.
        let second = SelfName::load_or_create(dir.path()).unwrap().get();
        assert_eq!(first, second);
    }

    #[test]
    fn user_edit_persists() {
        let dir = tempfile::tempdir().unwrap();
        {
            let sn = SelfName::load_or_create(dir.path()).unwrap();
            sn.set("NicoPC").unwrap();
            assert_eq!(sn.get(), "NicoPC");
        }
        // Reload from disk: the edit survived.
        assert_eq!(SelfName::load_or_create(dir.path()).unwrap().get(), "NicoPC");
    }

    #[test]
    fn empty_edit_rejected() {
        let sn = SelfName::fixed("keep-me");
        assert!(sn.set("   ").is_err());
        assert_eq!(sn.get(), "keep-me");
    }
}
