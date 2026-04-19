use argon2::Argon2;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    Key, XChaCha20Poly1305, XNonce,
};
use dirs::{config_local_dir, data_local_dir};
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use hkdf::Hkdf;
use keyring::Entry;
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, HashSet},
    fs,
    io::{Seek, SeekFrom, Write},
    path::PathBuf,
};
use thiserror::Error;
use x25519_dalek::{PublicKey as X25519PublicKey, StaticSecret};
use zeroize::Zeroize;

const PRODUCT_NAME: &str = "OSA Midnight Oil";
const CONTAINER_KIND: &str = "osa-midnight-oil.native-workspace";
const SNAPSHOT_KIND: &str = "osa-midnight-oil.native-snapshot";
const FILE_BLOB_KIND: &str = "osa-midnight-oil.native-file-blob";
const CONTAINER_VERSION: u32 = 1;
const ROOT_KEY_LENGTH: usize = 32;
const SALT_LENGTH: usize = 16;
const NONCE_LENGTH: usize = 24;
const KEYRING_SERVICE: &str = "osa-midnight-oil";
const NOSTR_KEYRING_PREFIX: &str = "nostr-secret";
const COMMS_PROTOCOL_VERSION: &str = "ros-comms.v0.1";
const COMMS_CIPHER_SUITE: &str = "X25519+HKDF-SHA256+XChaCha20-Poly1305+Ed25519";

#[derive(Debug, Error)]
pub enum SecureCoreError {
    #[error("workspace container could not be read")]
    MissingWorkspace,
    #[error("workspace container is invalid")]
    InvalidContainer,
    #[error("unable to decrypt with this passphrase")]
    InvalidPassphrase,
    #[error("unsupported compartment: {0}")]
    UnsupportedCompartment(String),
    #[error("record is missing a string id")]
    InvalidRecordId,
    #[error("i/o error: {0}")]
    Io(String),
    #[error("serialization error: {0}")]
    Serde(String),
    #[error("crypto error")]
    Crypto,
}

#[derive(Clone, Copy)]
pub struct CompartmentDef {
    pub id: &'static str,
    pub label: &'static str,
    pub sensitivity: &'static str,
}

pub fn list_compartment_defs() -> Vec<CompartmentDef> {
    vec![
        CompartmentDef {
            id: "notes_vault",
            label: "Vault Notes",
            sensitivity: "standard",
        },
        CompartmentDef {
            id: "identity_vault",
            label: "Identity Vault",
            sensitivity: "sensitive",
        },
        CompartmentDef {
            id: "wallet_vault",
            label: "Wallet Vault",
            sensitivity: "high",
        },
        CompartmentDef {
            id: "calendar_refs_vault",
            label: "Calendar & References",
            sensitivity: "standard",
        },
        CompartmentDef {
            id: "operator_profiles_vault",
            label: "Operator Profiles",
            sensitivity: "sensitive",
        },
        CompartmentDef {
            id: "comms_vault",
            label: "ROS Comms",
            sensitivity: "sensitive",
        },
    ]
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeVaultState {
    pub lifecycle: String,
    pub boot: Value,
    pub beta_workspace_detected: bool,
    pub keystore_available: bool,
}

#[derive(Debug, Clone)]
pub struct UnlockedWorkspace {
    pub workspace: Value,
    pub passphrase: String,
    pub unlocked_compartments: HashSet<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EncryptedBlob {
    nonce: String,
    ciphertext: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CompartmentEnvelope {
    wrapped_key: EncryptedBlob,
    payload: EncryptedBlob,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NativeWorkspaceContainer {
    kind: String,
    version: u32,
    product: String,
    created_at: String,
    updated_at: String,
    kdf: String,
    cipher: String,
    root_salt: String,
    boot: Value,
    compartments: HashMap<String, CompartmentEnvelope>,
    keystore_backed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NativeSnapshotContainer {
    kind: String,
    version: u32,
    product: String,
    exported_at: String,
    payload: EncryptedBlob,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NativeFileBlobContainer {
    kind: String,
    version: u32,
    mime_type: String,
    stored_at: String,
    size_bytes: Option<u64>,
    storage_mode: Option<String>,
    wrapped_key: Option<EncryptedBlob>,
    payload: Option<EncryptedBlob>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeFileBlobDescriptor {
    pub blob_id: String,
    pub mime_type: String,
    pub stored_at: String,
    pub size_bytes: u64,
    pub storage_mode: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CompartmentPayload {
    records: Value,
    search_index: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdentityCardExport {
    pub protocol_version: String,
    pub display_name: String,
    pub key_id: String,
    pub fingerprint: String,
    pub signing_public_key: String,
    pub encryption_public_key: String,
    pub relay_hints: Vec<String>,
    pub direct_hints: Vec<String>,
    pub network_policy: Value,
    pub exported_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdentityCardExportResult {
    pub card: IdentityCardExport,
    pub serialized: String,
    pub saved_path: Option<String>,
}

fn timestamp() -> String {
    format!("{:?}", std::time::SystemTime::now())
}

fn short_random_id(prefix: &str) -> String {
    let random = random_bytes::<8>();
    format!("{prefix}-{}", BASE64.encode(random).replace(['+', '/', '='], "").to_lowercase())
}

fn sha256_hex(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    digest.iter().map(|byte| format!("{byte:02x}")).collect::<String>()
}

fn key_id_from_public_key(bytes: &[u8]) -> String {
    let digest = sha256_hex(bytes);
    format!("CYD-{}", &digest[..12].to_uppercase())
}

fn signing_key_from_secret_b64(value: &str) -> Result<SigningKey, SecureCoreError> {
    let secret = BASE64.decode(value).map_err(|_| SecureCoreError::InvalidContainer)?;
    let signing_key = SigningKey::from_bytes(
        &secret
            .try_into()
            .map_err(|_| SecureCoreError::InvalidContainer)?,
    );
    Ok(signing_key)
}

fn x25519_secret_from_b64(value: &str) -> Result<StaticSecret, SecureCoreError> {
    let secret = BASE64.decode(value).map_err(|_| SecureCoreError::InvalidContainer)?;
    let secret_bytes: [u8; 32] = secret
        .try_into()
        .map_err(|_| SecureCoreError::InvalidContainer)?;
    Ok(StaticSecret::from(secret_bytes))
}

fn nostr_keyring_account(pubkey: &str) -> String {
    format!("{NOSTR_KEYRING_PREFIX}:{pubkey}")
}

pub fn save_nostr_secret_key(pubkey: &str, secret_hex: &str) -> Result<(), SecureCoreError> {
    let entry = Entry::new(KEYRING_SERVICE, &nostr_keyring_account(pubkey))
        .map_err(|error| SecureCoreError::Io(error.to_string()))?;
    entry
        .set_password(secret_hex)
        .map_err(|error| SecureCoreError::Io(error.to_string()))
}

pub fn load_nostr_secret_key(pubkey: &str) -> Result<Option<String>, SecureCoreError> {
    let entry = Entry::new(KEYRING_SERVICE, &nostr_keyring_account(pubkey))
        .map_err(|error| SecureCoreError::Io(error.to_string()))?;

    match entry.get_password() {
        Ok(secret) => Ok(Some(secret)),
        Err(_) => Ok(None),
    }
}

pub fn delete_nostr_secret_key(pubkey: &str) -> Result<(), SecureCoreError> {
    let entry = Entry::new(KEYRING_SERVICE, &nostr_keyring_account(pubkey))
        .map_err(|error| SecureCoreError::Io(error.to_string()))?;

    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(_) => Ok(()),
    }
}

fn app_dir() -> Result<PathBuf, SecureCoreError> {
    let base = data_local_dir()
        .or_else(config_local_dir)
        .ok_or_else(|| SecureCoreError::Io("no local app data directory available".to_string()))?;
    Ok(base.join("osa-midnight-oil"))
}

fn workspace_path() -> Result<PathBuf, SecureCoreError> {
    Ok(app_dir()?.join("workspace.v1.json"))
}

fn file_vault_dir() -> Result<PathBuf, SecureCoreError> {
    Ok(app_dir()?.join("file-vault"))
}

fn beta_marker_path() -> Result<PathBuf, SecureCoreError> {
    Ok(app_dir()?.join("beta-import.marker"))
}

fn ensure_app_dir() -> Result<PathBuf, SecureCoreError> {
    let directory = app_dir()?;
    fs::create_dir_all(&directory).map_err(|error| SecureCoreError::Io(error.to_string()))?;
    Ok(directory)
}

fn random_bytes<const N: usize>() -> [u8; N] {
    let mut bytes = [0_u8; N];
    OsRng.fill_bytes(&mut bytes);
    bytes
}

fn encrypt_bytes(key_bytes: &[u8], plaintext: &[u8]) -> Result<EncryptedBlob, SecureCoreError> {
    let key = Key::from_slice(key_bytes);
    let cipher = XChaCha20Poly1305::new(key);
    let nonce_bytes = random_bytes::<NONCE_LENGTH>();
    let nonce = XNonce::from_slice(&nonce_bytes);
    let ciphertext = cipher.encrypt(nonce, plaintext).map_err(|_| SecureCoreError::Crypto)?;
    Ok(EncryptedBlob {
        nonce: BASE64.encode(nonce_bytes),
        ciphertext: BASE64.encode(ciphertext),
    })
}

fn decrypt_bytes(key_bytes: &[u8], blob: &EncryptedBlob) -> Result<Vec<u8>, SecureCoreError> {
    let key = Key::from_slice(key_bytes);
    let cipher = XChaCha20Poly1305::new(key);
    let nonce_bytes = BASE64.decode(&blob.nonce).map_err(|_| SecureCoreError::InvalidContainer)?;
    let ciphertext = BASE64
        .decode(&blob.ciphertext)
        .map_err(|_| SecureCoreError::InvalidContainer)?;
    let nonce = XNonce::from_slice(&nonce_bytes);
    cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| SecureCoreError::InvalidPassphrase)
}

fn derive_root_key(passphrase: &str, salt: &[u8]) -> Result<[u8; ROOT_KEY_LENGTH], SecureCoreError> {
    let argon2 = Argon2::default();
    let mut output = [0_u8; ROOT_KEY_LENGTH];
    argon2
        .hash_password_into(passphrase.as_bytes(), salt, &mut output)
        .map_err(|_| SecureCoreError::Crypto)?;
    Ok(output)
}

fn boot_from_workspace(workspace: &Value, operator_profile: &Value) -> Value {
    let settings = workspace.get("settings").and_then(Value::as_object);
    let codename = settings
        .and_then(|value| value.get("codename"))
        .and_then(Value::as_str)
        .unwrap_or(PRODUCT_NAME);
    let operator = settings
        .and_then(|value| value.get("operator"))
        .and_then(Value::as_str)
        .or_else(|| operator_profile.get("operator").and_then(Value::as_str))
        .unwrap_or("Guest Operator");
    let wallpaper = settings
        .and_then(|value| value.get("wallpaper"))
        .and_then(Value::as_str)
        .unwrap_or("midnight-oil-state-one");
    let theme = settings
        .and_then(|value| value.get("theme"))
        .and_then(Value::as_str)
        .unwrap_or("midnight_oil");
    json!({
        "codename": codename,
        "operator": operator,
        "theme": theme,
        "wallpaper": wallpaper,
    })
}

fn default_comms_state() -> Value {
    json!({
        "identities": [],
        "peers": [
            {
                "id": "peer-directory-1",
                "peerId": "peer-directory-1",
                "displayName": "Aven Soryn",
                "knownKeyIds": ["CYD-7F31C0D2A891"],
                "knownFingerprints": ["c2b148a34d0f7a2e57c39d1fd7c0c1835b1870d27ed65f59d2d0f6619a9f0e71"],
                "signingPublicKey": "",
                "encryptionPublicKey": "ERERERERERERERERERERERERERERERERERERERERERE=",
                "relayHints": ["ros://dead-drop/local"],
                "directHints": [],
                "networkZones": { "clearnet": false, "tor": true, "freenet": false, "i2p": false },
                "verificationState": "unknown",
                "trustNotes": "Directory auto-populated from local relay roster.",
                "lastSeenAt": timestamp(),
                "rotationHistory": []
            },
            {
                "id": "peer-directory-2",
                "peerId": "peer-directory-2",
                "displayName": "Kael Meriden",
                "knownKeyIds": ["CYD-1D42BFF08C61"],
                "knownFingerprints": ["a3904f2d6786cfb25a3c6435db4e87666e6d5d62268b7b6dc839cf1b54a80f22"],
                "signingPublicKey": "",
                "encryptionPublicKey": "IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiI=",
                "relayHints": ["tor://citadel-noir/dead-drop"],
                "directHints": [],
                "networkZones": { "clearnet": false, "tor": true, "freenet": false, "i2p": true },
                "verificationState": "known-unverified",
                "trustNotes": "Known terminal. Awaiting fingerprint comparison.",
                "lastSeenAt": timestamp(),
                "rotationHistory": []
            },
            {
                "id": "peer-directory-3",
                "peerId": "peer-directory-3",
                "displayName": "Neris Vale",
                "knownKeyIds": ["CYD-B4A71D9E30CF"],
                "knownFingerprints": ["49b82ea5ccaeae118b8a751b5dc59b4d6670515a6b8dc8c2486d2db2d8bfa0c1"],
                "signingPublicKey": "",
                "encryptionPublicKey": "MzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM=",
                "relayHints": ["i2p://mesh-veil/dead-drop"],
                "directHints": [],
                "networkZones": { "clearnet": false, "tor": false, "freenet": false, "i2p": true },
                "verificationState": "warning",
                "trustNotes": "Stale key reported by relay roster.",
                "lastSeenAt": timestamp(),
                "rotationHistory": []
            }
        ],
        "conversations": [],
        "messages": [],
        "drafts": [],
        "outbox": [],
        "deadDrops": [],
        "receipts": [],
        "trustRecords": [],
        "attachmentRefs": [],
        "sessionAccessLog": [],
        "relays": [
            {
                "id": "relay-localhost",
                "routeId": "relay-localhost",
                "label": "OSA Local Relay",
                "relayUrl": "ros://dead-drop/local",
                "networkZone": "LOCAL",
                "priority": 1,
                "requiresManualApproval": false,
                "maxRetentionHours": 168,
                "status": "online"
            },
            {
                "id": "relay-tor",
                "routeId": "relay-tor",
                "label": "Noir Onion Relay",
                "relayUrl": "tor://citadel-noir/dead-drop",
                "networkZone": "TOR",
                "priority": 2,
                "requiresManualApproval": true,
                "maxRetentionHours": 72,
                "status": "standby"
            },
            {
                "id": "relay-i2p",
                "routeId": "relay-i2p",
                "label": "Mesh Veil Relay",
                "relayUrl": "i2p://mesh-veil/dead-drop",
                "networkZone": "I2P",
                "priority": 3,
                "requiresManualApproval": true,
                "maxRetentionHours": 96,
                "status": "standby"
            }
        ]
    })
}

fn default_workspace(operator_profile: &Value) -> Value {
    let operator = operator_profile
        .get("operator")
        .and_then(Value::as_str)
        .unwrap_or("Guest Operator");
    json!({
        "version": 4,
        "notes": [],
        "bookmarks": [],
        "inventory": [],
        "flowBoards": [],
        "calendarEvents": [],
        "library": [],
        "profiles": [],
        "wallets": [],
        "clocks": [],
        "managedArtifacts": [],
        "comms": default_comms_state(),
        "settings": {
            "codename": PRODUCT_NAME,
            "operator": operator,
            "theme": "midnight",
            "wallpaper": "violet-surge",
            "startupApp": "overview",
            "autoOpenOverview": true,
            "wipePhrase": "MIDNIGHT",
            "localOnly": true,
            "securityMode": "master-lock",
            "autoLockMinutes": 10,
            "privacyModeEnabled": true,
            "privacyPressHoldReveal": true,
            "privacyAutoRedactOnBlur": true,
            "privacyTimedRehide": true,
            "privacyTimedRehideSeconds": 20,
            "privacyDisableClipboard": true,
            "privacyMaskedPartialDisplay": true,
            "privacySessionAccessLog": true,
            "privacyElectronContentProtection": false,
            "sessionDefenseEnabled": false,
            "sessionDefenseBlurLock": false,
            "sessionDefenseLastWindowAction": "nuke",
            "fileVaultDeleteMode": "secure-delete",
            "commsRequireVerifiedPeer": false,
            "commsAllowClipboard": false,
            "commsDefaultRelayMode": "dead-drop",
            "commsRetentionHours": 168,
            "deadMansTriggerEnabled": false
        }
    })
}

fn compartment_value(workspace: &Value, compartment_id: &str) -> Result<Value, SecureCoreError> {
    let object = workspace.as_object().ok_or(SecureCoreError::InvalidContainer)?;
    let value = match compartment_id {
        "notes_vault" => json!({
            "notes": object.get("notes").cloned().unwrap_or_else(|| json!([])),
        }),
        "identity_vault" => json!({
            "profiles": object.get("profiles").cloned().unwrap_or_else(|| json!([])),
        }),
        "wallet_vault" => json!({
            "wallets": object.get("wallets").cloned().unwrap_or_else(|| json!([])),
        }),
        "calendar_refs_vault" => json!({
            "bookmarks": object.get("bookmarks").cloned().unwrap_or_else(|| json!([])),
            "inventory": object.get("inventory").cloned().unwrap_or_else(|| json!([])),
            "flowBoards": object.get("flowBoards").cloned().unwrap_or_else(|| json!([])),
            "calendarEvents": object.get("calendarEvents").cloned().unwrap_or_else(|| json!([])),
            "clocks": object.get("clocks").cloned().unwrap_or_else(|| json!([])),
        }),
        "operator_profiles_vault" => json!({
            "settings": object.get("settings").cloned().unwrap_or_else(|| json!({})),
        }),
        "comms_vault" => json!({
            "comms": object.get("comms").cloned().unwrap_or_else(default_comms_state),
        }),
        _ => return Err(SecureCoreError::UnsupportedCompartment(compartment_id.to_string())),
    };
    Ok(value)
}

fn merge_compartments(compartments: &HashMap<String, Value>) -> Value {
    let mut workspace = Map::new();
    workspace.insert("version".to_string(), json!(4));

    for value in compartments.values() {
        if let Some(object) = value.as_object() {
            for (key, field_value) in object {
                workspace.insert(key.clone(), field_value.clone());
            }
        }
    }

    Value::Object(workspace)
}

fn build_safe_search_index(compartment_id: &str, value: &Value) -> Vec<String> {
    match compartment_id {
        "notes_vault" => value
            .get("notes")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|note| {
                Some(format!(
                    "{} {} {} {}",
                    note.get("title")?.as_str().unwrap_or_default(),
                    note.get("category").and_then(Value::as_str).unwrap_or_default(),
                    note.get("tags")
                        .and_then(Value::as_array)
                        .map(|tags| {
                            tags.iter()
                                .filter_map(Value::as_str)
                                .collect::<Vec<_>>()
                                .join(" ")
                        })
                        .unwrap_or_default(),
                    note.get("body").and_then(Value::as_str).unwrap_or_default()
                ))
            })
            .collect(),
        "identity_vault" => value
            .get("profiles")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .map(|profile| {
                format!(
                    "{} {} {} {} {}",
                    profile.get("name").and_then(Value::as_str).unwrap_or_default(),
                    profile.get("address").and_then(Value::as_str).unwrap_or_default(),
                    join_string_array(profile.get("emails")),
                    join_string_array(profile.get("socialLogins")),
                    join_string_array(profile.get("vpnZones")),
                )
            })
            .collect(),
        "wallet_vault" => value
            .get("wallets")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .map(|wallet| {
                format!(
                    "{} {} {}",
                    wallet.get("label").and_then(Value::as_str).unwrap_or_default(),
                    wallet.get("network").and_then(Value::as_str).unwrap_or_default(),
                    join_string_array(wallet.get("addresses")),
                )
            })
            .collect(),
        "calendar_refs_vault" => {
            let bookmarks = value
                .get("bookmarks")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .map(|bookmark| {
                    format!(
                        "{} {} {} {}",
                        bookmark.get("title").and_then(Value::as_str).unwrap_or_default(),
                        bookmark.get("url").and_then(Value::as_str).unwrap_or_default(),
                        bookmark.get("category").and_then(Value::as_str).unwrap_or_default(),
                        bookmark.get("notes").and_then(Value::as_str).unwrap_or_default(),
                    )
                });
            let inventory = value
                .get("inventory")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .map(|item| {
                    format!(
                        "{} {} {} {} {}",
                        item.get("name").and_then(Value::as_str).unwrap_or_default(),
                        item.get("type").and_then(Value::as_str).unwrap_or_default(),
                        item.get("platform").and_then(Value::as_str).unwrap_or_default(),
                        item.get("status").and_then(Value::as_str).unwrap_or_default(),
                        item.get("notes").and_then(Value::as_str).unwrap_or_default(),
                    )
                });
            let calendar = value
                .get("calendarEvents")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .map(|event| {
                    format!(
                        "{} {} {} {} {}",
                        event.get("title").and_then(Value::as_str).unwrap_or_default(),
                        event.get("date").and_then(Value::as_str).unwrap_or_default(),
                        event.get("time").and_then(Value::as_str).unwrap_or_default(),
                        event.get("category").and_then(Value::as_str).unwrap_or_default(),
                        event.get("notes").and_then(Value::as_str).unwrap_or_default(),
                    )
                });
            bookmarks.chain(inventory).chain(calendar).collect()
        }
        "operator_profiles_vault" => value
            .get("settings")
            .map(|settings| {
                vec![format!(
                    "{} {} {}",
                    settings.get("codename").and_then(Value::as_str).unwrap_or_default(),
                    settings.get("operator").and_then(Value::as_str).unwrap_or_default(),
                    settings.get("wallpaper").and_then(Value::as_str).unwrap_or_default(),
                )]
            })
            .unwrap_or_default(),
        "comms_vault" => {
            let Some(comms) = value.get("comms").and_then(Value::as_object) else {
                return Vec::new();
            };

            let identities = comms
                .get("identities")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .map(|identity| {
                    format!(
                        "{} {} {} {}",
                        identity.get("displayName").and_then(Value::as_str).unwrap_or_default(),
                        identity.get("keyId").and_then(Value::as_str).unwrap_or_default(),
                        identity.get("fingerprint").and_then(Value::as_str).unwrap_or_default(),
                        join_string_array(identity.get("relayHints")),
                    )
                });

            let peers = comms
                .get("peers")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .map(|peer| {
                    format!(
                        "{} {} {} {}",
                        peer.get("displayName").and_then(Value::as_str).unwrap_or_default(),
                        join_string_array(peer.get("knownKeyIds")),
                        join_string_array(peer.get("knownFingerprints")),
                        peer.get("verificationState").and_then(Value::as_str).unwrap_or_default(),
                    )
                });

            let conversations = comms
                .get("conversations")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .map(|conversation| {
                    format!(
                        "{} {} {} {}",
                        conversation.get("title").and_then(Value::as_str).unwrap_or_default(),
                        conversation.get("localIdentityKeyId").and_then(Value::as_str).unwrap_or_default(),
                        conversation.get("peerKeyId").and_then(Value::as_str).unwrap_or_default(),
                        join_string_array(conversation.get("tags")),
                    )
                });

            let messages = comms
                .get("messages")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .map(|message| {
                    format!(
                        "{} {} {} {} {}",
                        message.get("conversationTitle").and_then(Value::as_str).unwrap_or_default(),
                        message.get("senderKeyId").and_then(Value::as_str).unwrap_or_default(),
                        message.get("recipientKeyId").and_then(Value::as_str).unwrap_or_default(),
                        message.get("direction").and_then(Value::as_str).unwrap_or_default(),
                        message.get("status").and_then(Value::as_str).unwrap_or_default(),
                    )
                });

            let attachments = comms
                .get("attachmentRefs")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .map(|attachment| {
                    format!(
                        "{} {} {}",
                        attachment.get("displayName").and_then(Value::as_str).unwrap_or_default(),
                        attachment.get("mediaType").and_then(Value::as_str).unwrap_or_default(),
                        attachment.get("sourceRecordId").and_then(Value::as_str).unwrap_or_default(),
                    )
                });

            identities
                .chain(peers)
                .chain(conversations)
                .chain(messages)
                .chain(attachments)
                .collect()
        }
        _ => Vec::new(),
    }
}

fn join_string_array(value: Option<&Value>) -> String {
    value
        .and_then(Value::as_array)
        .map(|entries| {
            entries
                .iter()
                .filter_map(Value::as_str)
                .collect::<Vec<_>>()
                .join(" ")
        })
        .unwrap_or_default()
}

fn seal_container(workspace: &Value, passphrase: &str, operator_profile: &Value) -> Result<NativeWorkspaceContainer, SecureCoreError> {
    let boot = boot_from_workspace(workspace, operator_profile);
    let salt = random_bytes::<SALT_LENGTH>();
    let mut root_key = derive_root_key(passphrase, &salt)?;
    let mut compartments = HashMap::new();

    for definition in list_compartment_defs() {
        let compartment_value = compartment_value(workspace, definition.id)?;
        let search_index = build_safe_search_index(definition.id, &compartment_value);
        let payload = CompartmentPayload {
            records: compartment_value,
            search_index,
        };
        let payload_bytes =
            serde_json::to_vec(&payload).map_err(|error| SecureCoreError::Serde(error.to_string()))?;
        let dek = random_bytes::<ROOT_KEY_LENGTH>();
        let wrapped_key = encrypt_bytes(&root_key, &dek)?;
        let encrypted_payload = encrypt_bytes(&dek, &payload_bytes)?;
        compartments.insert(
            definition.id.to_string(),
            CompartmentEnvelope {
                wrapped_key,
                payload: encrypted_payload,
            },
        );
    }

    let keystore_backed = persist_root_key_in_keyring(&root_key).is_ok();
    root_key.zeroize();

    Ok(NativeWorkspaceContainer {
        kind: CONTAINER_KIND.to_string(),
        version: CONTAINER_VERSION,
        product: PRODUCT_NAME.to_string(),
        created_at: timestamp(),
        updated_at: timestamp(),
        kdf: "Argon2id".to_string(),
        cipher: "XChaCha20-Poly1305".to_string(),
        root_salt: BASE64.encode(salt),
        boot,
        compartments,
        keystore_backed,
    })
}

fn unseal_container(container: &NativeWorkspaceContainer, passphrase: &str) -> Result<Value, SecureCoreError> {
    if container.kind != CONTAINER_KIND {
        return Err(SecureCoreError::InvalidContainer);
    }

    let salt = BASE64
        .decode(&container.root_salt)
        .map_err(|_| SecureCoreError::InvalidContainer)?;
    let mut root_key = derive_root_key(passphrase, &salt)?;
    let mut compartments = HashMap::new();

    for (compartment_id, envelope) in &container.compartments {
        let mut dek = decrypt_bytes(&root_key, &envelope.wrapped_key)?;
        let payload_bytes = decrypt_bytes(&dek, &envelope.payload)?;
        dek.zeroize();
        let payload: CompartmentPayload =
            serde_json::from_slice(&payload_bytes).map_err(|_| SecureCoreError::InvalidContainer)?;
        compartments.insert(compartment_id.clone(), payload.records);
    }

    root_key.zeroize();
    Ok(merge_compartments(&compartments))
}

fn read_container() -> Result<NativeWorkspaceContainer, SecureCoreError> {
    let path = workspace_path()?;
    let content = fs::read_to_string(path).map_err(|_| SecureCoreError::MissingWorkspace)?;
    serde_json::from_str(&content).map_err(|_| SecureCoreError::InvalidContainer)
}

fn write_container(container: &NativeWorkspaceContainer) -> Result<(), SecureCoreError> {
    ensure_app_dir()?;
    let content =
        serde_json::to_string_pretty(container).map_err(|error| SecureCoreError::Serde(error.to_string()))?;
    fs::write(workspace_path()?, content).map_err(|error| SecureCoreError::Io(error.to_string()))
}

fn persist_root_key_in_keyring(root_key: &[u8]) -> Result<(), SecureCoreError> {
    let entry = Entry::new(KEYRING_SERVICE, "primary-root").map_err(|error| SecureCoreError::Io(error.to_string()))?;
    entry
        .set_password(&BASE64.encode(root_key))
        .map_err(|error| SecureCoreError::Io(error.to_string()))
}

pub fn read_vault_state() -> Result<NativeVaultState, SecureCoreError> {
    let boot = read_container()
        .map(|container| container.boot)
        .unwrap_or_else(|_| json!({
            "codename": PRODUCT_NAME,
            "operator": "Guest Operator",
            "wallpaper": "violet-surge",
        }));
    let lifecycle = if workspace_path()?.exists() {
        "locked".to_string()
    } else {
        "setup".to_string()
    };
    Ok(NativeVaultState {
        lifecycle,
        boot,
        beta_workspace_detected: beta_marker_path()?.exists(),
        keystore_available: Entry::new(KEYRING_SERVICE, "primary-root").is_ok(),
    })
}

pub fn initialize_workspace_file(
    passphrase: &str,
    operator_profile: Value,
    workspace: Option<Value>,
) -> Result<UnlockedWorkspace, SecureCoreError> {
    let workspace_value = workspace.unwrap_or_else(|| default_workspace(&operator_profile));
    let container = seal_container(&workspace_value, passphrase, &operator_profile)?;
    write_container(&container)?;
    Ok(UnlockedWorkspace {
        workspace: workspace_value,
        passphrase: passphrase.to_string(),
        unlocked_compartments: list_compartment_defs()
            .into_iter()
            .map(|definition| definition.id.to_string())
            .collect(),
    })
}

pub fn unlock_workspace_file(passphrase: &str) -> Result<UnlockedWorkspace, SecureCoreError> {
    let container = read_container()?;
    let workspace = unseal_container(&container, passphrase)?;
    Ok(UnlockedWorkspace {
        workspace,
        passphrase: passphrase.to_string(),
        unlocked_compartments: list_compartment_defs()
            .into_iter()
            .filter(|definition| definition.sensitivity == "standard")
            .map(|definition| definition.id.to_string())
            .collect(),
    })
}

pub fn lock_session(session: &mut Option<UnlockedWorkspace>) {
    if let Some(current) = session.as_mut() {
        current.passphrase.zeroize();
    }
    *session = None;
}

pub fn unlock_compartment_gate(
    session: &mut UnlockedWorkspace,
    compartment_id: &str,
    _intent: Option<&str>,
) -> Result<(), SecureCoreError> {
    if !list_compartment_defs().iter().any(|definition| definition.id == compartment_id) {
        return Err(SecureCoreError::UnsupportedCompartment(compartment_id.to_string()));
    }
    session.unlocked_compartments.insert(compartment_id.to_string());
    Ok(())
}

pub fn persist_workspace_file(session: &UnlockedWorkspace) -> Result<(), SecureCoreError> {
    let operator_profile = json!({
        "operator": session
            .workspace
            .get("settings")
            .and_then(|settings| settings.get("operator"))
            .and_then(Value::as_str)
            .unwrap_or("Guest Operator")
    });
    let container = seal_container(&session.workspace, &session.passphrase, &operator_profile)?;
    write_container(&container)
}

pub fn remove_workspace_file() -> Result<(), SecureCoreError> {
    let path = workspace_path()?;
    if path.exists() {
        fs::remove_file(path).map_err(|error| SecureCoreError::Io(error.to_string()))?;
    }

    let vault_dir = file_vault_dir()?;
    if vault_dir.exists() {
        fs::remove_dir_all(vault_dir).map_err(|error| SecureCoreError::Io(error.to_string()))?;
    }

    Ok(())
}

fn file_blob_path(blob_id: &str) -> Result<PathBuf, SecureCoreError> {
    let safe_name = blob_id
        .chars()
        .filter(|character| character.is_ascii_alphanumeric() || *character == '-' || *character == '_')
        .collect::<String>();
    Ok(file_vault_dir()?.join(format!("{safe_name}.blob.json")))
}

pub fn store_file_blob(
    session: &UnlockedWorkspace,
    blob_id: &str,
    mime_type: &str,
    payload_bytes: &[u8],
) -> Result<(), SecureCoreError> {
    let vault_dir = file_vault_dir()?;
    fs::create_dir_all(&vault_dir).map_err(|error| SecureCoreError::Io(error.to_string()))?;
    let mut root_key = derive_root_key(&session.passphrase, &[0x33; SALT_LENGTH])?;
    let file_key = random_bytes::<ROOT_KEY_LENGTH>();
    let wrapped_key = encrypt_bytes(&root_key, &file_key)?;
    let payload = encrypt_bytes(&file_key, payload_bytes)?;
    root_key.zeroize();

    let container = NativeFileBlobContainer {
        kind: FILE_BLOB_KIND.to_string(),
        version: CONTAINER_VERSION,
        mime_type: mime_type.to_string(),
        stored_at: timestamp(),
        size_bytes: Some(payload_bytes.len() as u64),
        storage_mode: Some("wrapped-file-key".to_string()),
        wrapped_key: Some(wrapped_key),
        payload: Some(payload),
    };

    let serialized =
        serde_json::to_string_pretty(&container).map_err(|error| SecureCoreError::Serde(error.to_string()))?;
    fs::write(file_blob_path(blob_id)?, serialized).map_err(|error| SecureCoreError::Io(error.to_string()))
}

pub fn read_file_blob(session: &UnlockedWorkspace, blob_id: &str) -> Result<(String, String), SecureCoreError> {
    let content =
        fs::read_to_string(file_blob_path(blob_id)?).map_err(|error| SecureCoreError::Io(error.to_string()))?;
    let container: NativeFileBlobContainer =
        serde_json::from_str(&content).map_err(|error| SecureCoreError::Serde(error.to_string()))?;

    if container.kind != FILE_BLOB_KIND {
        return Err(SecureCoreError::InvalidContainer);
    }

    let mut root_key = derive_root_key(&session.passphrase, &[0x33; SALT_LENGTH])?;
    let bytes = if let (Some(wrapped_key), Some(payload)) = (&container.wrapped_key, &container.payload) {
        let mut file_key = decrypt_bytes(&root_key, wrapped_key)?;
        let bytes = decrypt_bytes(&file_key, payload)?;
        file_key.zeroize();
        bytes
    } else if let Some(payload) = &container.payload {
        decrypt_bytes(&root_key, payload)?
    } else {
        return Err(SecureCoreError::InvalidContainer);
    };
    root_key.zeroize();

    Ok((container.mime_type, BASE64.encode(bytes)))
}

fn crypto_shred_blob_file(path: &PathBuf) -> Result<u64, SecureCoreError> {
    let original_size = fs::metadata(path)
        .map(|metadata| metadata.len())
        .unwrap_or(0);

    let tombstone = NativeFileBlobContainer {
        kind: FILE_BLOB_KIND.to_string(),
        version: CONTAINER_VERSION,
        mime_type: "application/octet-stream".to_string(),
        stored_at: timestamp(),
        size_bytes: Some(0),
        storage_mode: Some("crypto-shred-tombstone".to_string()),
        wrapped_key: None,
        payload: None,
    };

    let serialized =
        serde_json::to_string_pretty(&tombstone).map_err(|error| SecureCoreError::Serde(error.to_string()))?;

    let mut file = fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(path)
        .map_err(|error| SecureCoreError::Io(error.to_string()))?;
    file.write_all(serialized.as_bytes())
        .map_err(|error| SecureCoreError::Io(error.to_string()))?;
    file.sync_all()
        .map_err(|error| SecureCoreError::Io(error.to_string()))?;

    Ok(original_size.max(serialized.len() as u64))
}

fn best_effort_overwrite_file(path: &PathBuf, target_size: u64) -> Result<(), SecureCoreError> {
    if target_size == 0 {
        return Ok(());
    }

    let mut file = fs::OpenOptions::new()
        .write(true)
        .open(path)
        .map_err(|error| SecureCoreError::Io(error.to_string()))?;

    let chunk_len = 1024 * 1024;
    let mut random_chunk = vec![0_u8; chunk_len];
    OsRng.fill_bytes(&mut random_chunk);
    let zero_chunk = vec![0_u8; chunk_len];
    let ff_chunk = vec![0xFF_u8; chunk_len];
    let mut second_random_chunk = vec![0_u8; chunk_len];
    OsRng.fill_bytes(&mut second_random_chunk);
    let patterns = [random_chunk, zero_chunk, ff_chunk, second_random_chunk];

    for pattern in patterns {
        file.seek(SeekFrom::Start(0))
            .map_err(|error| SecureCoreError::Io(error.to_string()))?;
        let mut remaining = target_size;
        while remaining > 0 {
            let length = remaining.min(pattern.len() as u64) as usize;
            file.write_all(&pattern[..length])
                .map_err(|error| SecureCoreError::Io(error.to_string()))?;
            remaining -= length as u64;
        }
        file.flush()
            .map_err(|error| SecureCoreError::Io(error.to_string()))?;
        file.sync_all()
            .map_err(|error| SecureCoreError::Io(error.to_string()))?;
    }

    Ok(())
}

pub fn delete_file_blob(blob_id: &str, mode: &str) -> Result<(), SecureCoreError> {
    let path = file_blob_path(blob_id)?;

    if !path.exists() {
        return Ok(());
    }

    match mode {
        "secure-delete" => {
            let _ = crypto_shred_blob_file(&path)?;
        }
        "best-effort-overwrite" => {
            let target_size = crypto_shred_blob_file(&path)?;
            best_effort_overwrite_file(&path, target_size)?;
        }
        _ => {}
    }

    fs::remove_file(path).map_err(|error| SecureCoreError::Io(error.to_string()))?;
    Ok(())
}

pub fn list_file_blobs() -> Result<Vec<NativeFileBlobDescriptor>, SecureCoreError> {
    let vault_dir = file_vault_dir()?;
    if !vault_dir.exists() {
      return Ok(Vec::new());
    }

    let mut entries = Vec::new();

    for item in fs::read_dir(vault_dir).map_err(|error| SecureCoreError::Io(error.to_string()))? {
        let item = item.map_err(|error| SecureCoreError::Io(error.to_string()))?;
        let path = item.path();

        if path.extension().and_then(|value| value.to_str()) != Some("json") {
            continue;
        }

        let content = fs::read_to_string(&path).map_err(|error| SecureCoreError::Io(error.to_string()))?;
        let container: NativeFileBlobContainer =
            serde_json::from_str(&content).map_err(|error| SecureCoreError::Serde(error.to_string()))?;

        if container.kind != FILE_BLOB_KIND {
            continue;
        }

        let blob_id = path
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .trim_end_matches(".blob")
            .to_string();

        let fallback_size = fs::metadata(&path)
            .map(|metadata| metadata.len())
            .unwrap_or(0);

        entries.push(NativeFileBlobDescriptor {
            blob_id,
            mime_type: container.mime_type,
            stored_at: container.stored_at,
            size_bytes: container.size_bytes.unwrap_or(fallback_size),
            storage_mode: container.storage_mode.unwrap_or_else(|| "legacy-root-key".to_string()),
        });
    }

    entries.sort_by(|left, right| right.stored_at.cmp(&left.stored_at));
    Ok(entries)
}

fn ensure_comms_object(workspace: &mut Map<String, Value>) -> &mut Map<String, Value> {
    if !workspace.contains_key("comms") {
        workspace.insert("comms".to_string(), default_comms_state());
    }

    workspace
        .get_mut("comms")
        .and_then(Value::as_object_mut)
        .expect("default comms state should always be an object")
}

fn ensure_comms_array<'a>(comms: &'a mut Map<String, Value>, key: &str) -> &'a mut Vec<Value> {
    if !comms.contains_key(key) {
        comms.insert(key.to_string(), json!([]));
    }

    comms
        .get_mut(key)
        .and_then(Value::as_array_mut)
        .expect("default comms state should always contain arrays")
}

fn find_record<'a>(values: &'a [Value], id: &str) -> Option<&'a Value> {
    values
        .iter()
        .find(|entry| entry.get("id").and_then(Value::as_str) == Some(id))
}

fn insert_or_replace(values: &mut Vec<Value>, record: Value) {
    let Some(record_id) = record.get("id").and_then(Value::as_str) else {
        values.push(record);
        return;
    };

    if let Some(index) = values
        .iter()
        .position(|entry| entry.get("id").and_then(Value::as_str) == Some(record_id))
    {
        values[index] = record;
    } else {
        values.push(record);
    }
}

fn delete_by_id(values: &mut Vec<Value>, id: &str) {
    values.retain(|entry| entry.get("id").and_then(Value::as_str) != Some(id));
}

fn conversation_title_from_peer(peer: &Value) -> String {
    peer.get("displayName")
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("Untitled conversation")
        .to_string()
}

fn preview_text(body: &str) -> String {
    let sanitized = body.replace('\n', " ");
    sanitized.chars().take(160).collect::<String>()
}

fn derive_message_key(shared_secret: &[u8], conversation_id: &str, sequence_number: u64) -> Result<[u8; 32], SecureCoreError> {
    let hk = Hkdf::<Sha256>::new(Some(conversation_id.as_bytes()), shared_secret);
    let mut output = [0_u8; 32];
    hk.expand(
        format!("message:{conversation_id}:{sequence_number}").as_bytes(),
        &mut output,
    )
    .map_err(|_| SecureCoreError::Crypto)?;
    Ok(output)
}

fn seal_message_payload(
    sender_identity: &Value,
    recipient_identity: &Value,
    conversation_id: &str,
    sequence_number: u64,
    body: &Value,
) -> Result<(String, String, String), SecureCoreError> {
    let sender_secret = sender_identity
        .get("encryptionSecretRef")
        .and_then(Value::as_str)
        .ok_or(SecureCoreError::InvalidContainer)?;
    let recipient_public = recipient_identity
        .get("encryptionPublicKey")
        .and_then(Value::as_str)
        .ok_or(SecureCoreError::InvalidContainer)?;
    let signing_secret = sender_identity
        .get("signingSecretRef")
        .and_then(Value::as_str)
        .ok_or(SecureCoreError::InvalidContainer)?;

    let sender_x = x25519_secret_from_b64(sender_secret)?;
    let recipient_public_bytes = BASE64
        .decode(recipient_public)
        .map_err(|_| SecureCoreError::InvalidContainer)?;
    let recipient_public_array: [u8; 32] = recipient_public_bytes
        .try_into()
        .map_err(|_| SecureCoreError::InvalidContainer)?;
    let recipient_x = X25519PublicKey::from(recipient_public_array);
    let shared = sender_x.diffie_hellman(&recipient_x);
    let message_key = derive_message_key(shared.as_bytes(), conversation_id, sequence_number)?;
    let payload_bytes = serde_json::to_vec(body).map_err(|error| SecureCoreError::Serde(error.to_string()))?;
    let encrypted = encrypt_bytes(&message_key, &payload_bytes)?;
    let envelope_string = format!(
        "{}:{}:{}",
        encrypted.nonce,
        encrypted.ciphertext,
        sequence_number
    );

    let signing_key = signing_key_from_secret_b64(signing_secret)?;
    let signature: Signature = signing_key.sign(envelope_string.as_bytes());

    Ok((
        encrypted.nonce,
        encrypted.ciphertext,
        BASE64.encode(signature.to_bytes()),
    ))
}

fn verify_and_open_message_payload(
    local_identity: &Value,
    sender_identity_like: &Value,
    conversation_id: &str,
    sequence_number: u64,
    nonce_b64: &str,
    ciphertext_b64: &str,
    signature_b64: &str,
) -> Result<Value, SecureCoreError> {
    let sender_signing_public = sender_identity_like
        .get("signingPublicKey")
        .and_then(Value::as_str)
        .ok_or(SecureCoreError::InvalidContainer)?;
    let local_secret = local_identity
        .get("encryptionSecretRef")
        .and_then(Value::as_str)
        .ok_or(SecureCoreError::InvalidContainer)?;
    let sender_public = sender_identity_like
        .get("encryptionPublicKey")
        .and_then(Value::as_str)
        .ok_or(SecureCoreError::InvalidContainer)?;

    let verifying_key = VerifyingKey::from_bytes(
        &BASE64
            .decode(sender_signing_public)
            .map_err(|_| SecureCoreError::InvalidContainer)?
            .try_into()
            .map_err(|_| SecureCoreError::InvalidContainer)?,
    )
    .map_err(|_| SecureCoreError::InvalidContainer)?;

    let signature = Signature::from_bytes(
        &BASE64
            .decode(signature_b64)
            .map_err(|_| SecureCoreError::InvalidContainer)?
            .try_into()
            .map_err(|_| SecureCoreError::InvalidContainer)?,
    );

    let envelope_string = format!("{nonce_b64}:{ciphertext_b64}:{sequence_number}");
    verifying_key
        .verify(envelope_string.as_bytes(), &signature)
        .map_err(|_| SecureCoreError::Crypto)?;

    let local_x = x25519_secret_from_b64(local_secret)?;
    let sender_public_bytes = BASE64
        .decode(sender_public)
        .map_err(|_| SecureCoreError::InvalidContainer)?;
    let sender_public_array: [u8; 32] = sender_public_bytes
        .try_into()
        .map_err(|_| SecureCoreError::InvalidContainer)?;
    let sender_public_x = X25519PublicKey::from(sender_public_array);
    let shared = local_x.diffie_hellman(&sender_public_x);
    let message_key = derive_message_key(shared.as_bytes(), conversation_id, sequence_number)?;
    let payload = decrypt_bytes(
        &message_key,
        &EncryptedBlob {
            nonce: nonce_b64.to_string(),
            ciphertext: ciphertext_b64.to_string(),
        },
    )?;
    serde_json::from_slice(&payload).map_err(|error| SecureCoreError::Serde(error.to_string()))
}

pub fn create_comms_identity_in_workspace(
    workspace: Value,
    profile_id: &str,
    display_name: &str,
    relay_hints: Vec<String>,
    direct_hints: Vec<String>,
    network_policy: Value,
    trust_policy: Value,
) -> Result<Value, SecureCoreError> {
    let mut workspace_object = workspace.as_object().cloned().ok_or(SecureCoreError::InvalidContainer)?;
    let comms = ensure_comms_object(&mut workspace_object);

    let signing_key = SigningKey::generate(&mut OsRng);
    let signing_public = signing_key.verifying_key();
    let encryption_secret = StaticSecret::random_from_rng(OsRng);
    let encryption_public = X25519PublicKey::from(&encryption_secret);
    let key_id = key_id_from_public_key(signing_public.as_bytes());

    let identity = json!({
        "id": short_random_id("identity"),
        "identityId": short_random_id("identity"),
        "profileId": profile_id,
        "displayName": display_name,
        "keyId": key_id,
        "signingPublicKey": BASE64.encode(signing_public.as_bytes()),
        "signingSecretRef": BASE64.encode(signing_key.to_bytes()),
        "encryptionPublicKey": BASE64.encode(encryption_public.as_bytes()),
        "encryptionSecretRef": BASE64.encode(encryption_secret.to_bytes()),
        "fingerprint": sha256_hex(signing_public.as_bytes()),
        "relayHints": relay_hints,
        "directHints": direct_hints,
        "networkPolicy": network_policy,
        "trustPolicy": trust_policy,
        "rotationState": "active",
        "createdAt": timestamp(),
        "rotatedAt": Value::Null,
        "revokedAt": Value::Null,
    });

    insert_or_replace(ensure_comms_array(comms, "identities"), identity);
    Ok(Value::Object(workspace_object))
}

pub fn rotate_comms_identity_in_workspace(workspace: Value, identity_id: &str) -> Result<Value, SecureCoreError> {
    let mut workspace_object = workspace.as_object().cloned().ok_or(SecureCoreError::InvalidContainer)?;
    let comms = ensure_comms_object(&mut workspace_object);
    let identities = ensure_comms_array(comms, "identities");
    let Some(index) = identities
        .iter()
        .position(|entry| entry.get("id").and_then(Value::as_str) == Some(identity_id)) else {
        return Err(SecureCoreError::InvalidRecordId);
    };

    let current = identities[index].clone();
    let profile_id = current.get("profileId").and_then(Value::as_str).unwrap_or_default();
    let display_name = current.get("displayName").and_then(Value::as_str).unwrap_or("Identity");
    let relay_hints = current
        .get("relayHints")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|entry| entry.as_str().map(|value| value.to_string()))
        .collect::<Vec<_>>();
    let direct_hints = current
        .get("directHints")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|entry| entry.as_str().map(|value| value.to_string()))
        .collect::<Vec<_>>();
    let network_policy = current.get("networkPolicy").cloned().unwrap_or_else(|| json!({}));
    let trust_policy = current.get("trustPolicy").cloned().unwrap_or_else(|| json!({}));

    let updated_workspace = create_comms_identity_in_workspace(
        Value::Object(workspace_object),
        profile_id,
        display_name,
        relay_hints,
        direct_hints,
        network_policy,
        trust_policy,
    )?;

    let mut next = updated_workspace.as_object().cloned().ok_or(SecureCoreError::InvalidContainer)?;
    let comms = ensure_comms_object(&mut next);
    let identities = ensure_comms_array(comms, "identities");
    if let Some(old_index) = identities
        .iter()
        .position(|entry| entry.get("id").and_then(Value::as_str) == Some(identity_id))
    {
        let mut legacy = identities[old_index].clone();
        legacy["rotationState"] = json!("rotated");
        legacy["rotatedAt"] = json!(timestamp());
        identities[old_index] = legacy;
    }

    Ok(Value::Object(next))
}

pub fn export_identity_card_from_workspace(
    workspace: &Value,
    identity_id: &str,
    target_path: Option<&str>,
) -> Result<IdentityCardExportResult, SecureCoreError> {
    let identities = workspace
        .get("comms")
        .and_then(|comms| comms.get("identities"))
        .and_then(Value::as_array)
        .ok_or(SecureCoreError::InvalidContainer)?;
    let identity = find_record(identities, identity_id).ok_or(SecureCoreError::InvalidRecordId)?;
    let card = IdentityCardExport {
        protocol_version: COMMS_PROTOCOL_VERSION.to_string(),
        display_name: identity.get("displayName").and_then(Value::as_str).unwrap_or_default().to_string(),
        key_id: identity.get("keyId").and_then(Value::as_str).unwrap_or_default().to_string(),
        fingerprint: identity.get("fingerprint").and_then(Value::as_str).unwrap_or_default().to_string(),
        signing_public_key: identity.get("signingPublicKey").and_then(Value::as_str).unwrap_or_default().to_string(),
        encryption_public_key: identity.get("encryptionPublicKey").and_then(Value::as_str).unwrap_or_default().to_string(),
        relay_hints: identity
            .get("relayHints")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .filter_map(|entry| entry.as_str().map(|value| value.to_string()))
            .collect(),
        direct_hints: identity
            .get("directHints")
            .and_then(Value::as_array)
            .cloned()
            .unwrap_or_default()
            .into_iter()
            .filter_map(|entry| entry.as_str().map(|value| value.to_string()))
            .collect(),
        network_policy: identity.get("networkPolicy").cloned().unwrap_or_else(|| json!({})),
        exported_at: timestamp(),
    };

    let serialized = serde_json::to_string_pretty(&card).map_err(|error| SecureCoreError::Serde(error.to_string()))?;
    let saved_path = if let Some(path) = target_path {
        fs::write(path, &serialized).map_err(|error| SecureCoreError::Io(error.to_string()))?;
        Some(path.to_string())
    } else {
        None
    };

    Ok(IdentityCardExportResult {
        card,
        serialized,
        saved_path,
    })
}

pub fn import_peer_card_into_workspace(
    workspace: Value,
    source: &str,
    trust_mode: Option<&str>,
) -> Result<Value, SecureCoreError> {
    let card: IdentityCardExport =
        serde_json::from_str(source).map_err(|error| SecureCoreError::Serde(error.to_string()))?;
    let mut workspace_object = workspace.as_object().cloned().ok_or(SecureCoreError::InvalidContainer)?;
    let comms = ensure_comms_object(&mut workspace_object);
    let peer = json!({
        "id": short_random_id("peer"),
        "peerId": short_random_id("peer"),
        "displayName": card.display_name,
        "knownKeyIds": [card.key_id.clone()],
        "knownFingerprints": [card.fingerprint.clone()],
        "signingPublicKey": card.signing_public_key,
        "encryptionPublicKey": card.encryption_public_key,
        "relayHints": card.relay_hints,
        "directHints": card.direct_hints,
        "networkZones": card.network_policy,
        "verificationState": if trust_mode == Some("verified") { "verified" } else { "known-unverified" },
        "trustNotes": "",
        "lastSeenAt": timestamp(),
        "rotationHistory": [],
    });

    insert_or_replace(ensure_comms_array(comms, "peers"), peer);
    Ok(Value::Object(workspace_object))
}

pub fn verify_peer_in_workspace(
    workspace: Value,
    peer_id: &str,
    fingerprint: &str,
    key_id: &str,
) -> Result<Value, SecureCoreError> {
    let mut workspace_object = workspace.as_object().cloned().ok_or(SecureCoreError::InvalidContainer)?;
    let comms = ensure_comms_object(&mut workspace_object);
    let peers = ensure_comms_array(comms, "peers");
    let Some(index) = peers
        .iter()
        .position(|entry| entry.get("id").and_then(Value::as_str) == Some(peer_id)) else {
        return Err(SecureCoreError::InvalidRecordId);
    };

    let valid = peers[index]
        .get("knownFingerprints")
        .and_then(Value::as_array)
        .map(|entries| entries.iter().any(|entry| entry.as_str() == Some(fingerprint)))
        .unwrap_or(false)
        && peers[index]
            .get("knownKeyIds")
            .and_then(Value::as_array)
            .map(|entries| entries.iter().any(|entry| entry.as_str() == Some(key_id)))
            .unwrap_or(false);

    if !valid {
        return Err(SecureCoreError::Crypto);
    }

    peers[index]["verificationState"] = json!("verified");
    peers[index]["lastSeenAt"] = json!(timestamp());
    Ok(Value::Object(workspace_object))
}

pub fn create_conversation_in_workspace(
    workspace: Value,
    local_identity_id: &str,
    peer_id: &str,
    title: Option<&str>,
    tags: Vec<String>,
    require_verified_peer: bool,
) -> Result<Value, SecureCoreError> {
    let mut workspace_object = workspace.as_object().cloned().ok_or(SecureCoreError::InvalidContainer)?;
    let comms = ensure_comms_object(&mut workspace_object);
    let identities = ensure_comms_array(comms, "identities").clone();
    let peers = ensure_comms_array(comms, "peers").clone();

    let identity = find_record(&identities, local_identity_id).ok_or(SecureCoreError::InvalidRecordId)?;
    let peer = find_record(&peers, peer_id).ok_or(SecureCoreError::InvalidRecordId)?;
    if require_verified_peer
        && peer.get("verificationState").and_then(Value::as_str) != Some("verified")
    {
        return Err(SecureCoreError::Crypto);
    }

    let conversation = json!({
        "id": short_random_id("conversation"),
        "conversationId": short_random_id("conversation"),
        "title": title.unwrap_or(&conversation_title_from_peer(peer)),
        "localIdentityId": local_identity_id,
        "localIdentityKeyId": identity.get("keyId").cloned().unwrap_or(Value::Null),
        "peerId": peer_id,
        "peerKeyId": peer
            .get("knownKeyIds")
            .and_then(Value::as_array)
            .and_then(|entries| entries.first().cloned())
            .unwrap_or(Value::Null),
        "peerDisplayName": peer.get("displayName").cloned().unwrap_or(Value::Null),
        "deliveryMode": "dead-drop",
        "status": "active",
        "sequenceNumber": 0,
        "tags": tags,
        "createdAt": timestamp(),
        "updatedAt": timestamp(),
        "lastMessageAt": Value::Null,
    });

    insert_or_replace(ensure_comms_array(comms, "conversations"), conversation);
    Ok(Value::Object(workspace_object))
}

pub fn save_comms_draft_in_workspace(
    workspace: Value,
    conversation_id: &str,
    draft: Value,
) -> Result<Value, SecureCoreError> {
    let mut workspace_object = workspace.as_object().cloned().ok_or(SecureCoreError::InvalidContainer)?;
    let comms = ensure_comms_object(&mut workspace_object);
    let draft_record = json!({
        "id": draft.get("id").cloned().unwrap_or_else(|| json!(short_random_id("draft"))),
        "conversationId": conversation_id,
        "body": draft.get("body").cloned().unwrap_or_else(|| json!("")),
        "attachmentRefs": draft.get("attachmentRefs").cloned().unwrap_or_else(|| json!([])),
        "replyToMessageId": draft.get("replyToMessageId").cloned().unwrap_or(Value::Null),
        "updatedAt": timestamp(),
    });
    insert_or_replace(ensure_comms_array(comms, "drafts"), draft_record);
    Ok(Value::Object(workspace_object))
}

pub fn send_comms_message_in_workspace(
    workspace: Value,
    conversation_id: &str,
    draft: Value,
    delivery_mode: Option<&str>,
) -> Result<Value, SecureCoreError> {
    let mut workspace_object = workspace.as_object().cloned().ok_or(SecureCoreError::InvalidContainer)?;
    let comms = ensure_comms_object(&mut workspace_object);

    let identities = ensure_comms_array(comms, "identities").clone();
    let peers = ensure_comms_array(comms, "peers").clone();
    let conversations_snapshot = ensure_comms_array(comms, "conversations").clone();
    let Some(conversation_index) = conversations_snapshot
        .iter()
        .position(|entry| entry.get("id").and_then(Value::as_str) == Some(conversation_id)) else {
        return Err(SecureCoreError::InvalidRecordId);
    };

    let conversation = conversations_snapshot[conversation_index].clone();
    let local_identity_id = conversation
        .get("localIdentityId")
        .and_then(Value::as_str)
        .ok_or(SecureCoreError::InvalidContainer)?;
    let peer_id = conversation
        .get("peerId")
        .and_then(Value::as_str)
        .ok_or(SecureCoreError::InvalidContainer)?;

    let sender_identity = find_record(&identities, local_identity_id).ok_or(SecureCoreError::InvalidRecordId)?;
    let peer = find_record(&peers, peer_id).ok_or(SecureCoreError::InvalidRecordId)?;

    let recipient_identity_like = json!({
        "encryptionPublicKey": peer.get("encryptionPublicKey").cloned().unwrap_or(Value::Null),
        "signingPublicKey": peer.get("signingPublicKey").cloned().unwrap_or(Value::Null),
    });

    let next_sequence = conversation.get("sequenceNumber").and_then(Value::as_u64).unwrap_or(0) + 1;
    let message_id = short_random_id("message");
    let preview = preview_text(draft.get("body").and_then(Value::as_str).unwrap_or_default());
    let payload = json!({
        "messageId": message_id,
        "conversationId": conversation_id,
        "body": draft.get("body").cloned().unwrap_or_else(|| json!("")),
        "attachmentRefs": draft.get("attachmentRefs").cloned().unwrap_or_else(|| json!([])),
        "replyToMessageId": draft.get("replyToMessageId").cloned().unwrap_or(Value::Null),
        "policy": draft.get("policy").cloned().unwrap_or_else(|| json!({})),
    });

    let (nonce, ciphertext, signature) = seal_message_payload(
        sender_identity,
        &recipient_identity_like,
        conversation_id,
        next_sequence,
        &payload,
    )?;

    let sender_key_id = sender_identity.get("keyId").and_then(Value::as_str).unwrap_or_default();
    let recipient_key_id = peer
        .get("knownKeyIds")
        .and_then(Value::as_array)
        .and_then(|entries| entries.first())
        .and_then(Value::as_str)
        .unwrap_or_default();

    let attachment_refs = draft.get("attachmentRefs").cloned().unwrap_or_else(|| json!([]));
    let envelope = json!({
        "id": short_random_id("envelope"),
        "envelopeId": short_random_id("envelope"),
        "protocolVersion": COMMS_PROTOCOL_VERSION,
        "conversationId": conversation_id,
        "messageId": message_id,
        "senderKeyId": sender_key_id,
        "recipientKeyId": recipient_key_id,
        "senderFingerprint": sender_identity.get("fingerprint").cloned().unwrap_or(Value::Null),
        "recipientFingerprint": peer
            .get("knownFingerprints")
            .and_then(Value::as_array)
            .and_then(|entries| entries.first().cloned())
            .unwrap_or(Value::Null),
        "createdAt": timestamp(),
        "sequenceNumber": next_sequence,
        "deliveryMode": delivery_mode.unwrap_or("dead-drop"),
        "replyToMessageId": draft.get("replyToMessageId").cloned().unwrap_or(Value::Null),
        "attachmentRefs": attachment_refs,
        "cipherSuite": COMMS_CIPHER_SUITE,
        "ephemeralPublicKey": Value::Null,
        "ciphertext": ciphertext,
        "nonce": nonce,
        "signature": signature,
        "status": "queued",
    });

    let message = json!({
        "id": message_id,
        "conversationId": conversation_id,
        "conversationTitle": conversation.get("title").cloned().unwrap_or(Value::Null),
        "direction": "outbound",
        "senderKeyId": sender_key_id,
        "recipientKeyId": recipient_key_id,
        "preview": preview,
        "attachmentCount": draft
            .get("attachmentRefs")
            .and_then(Value::as_array)
            .map(|entries| entries.len())
            .unwrap_or(0),
        "status": "queued",
        "createdAt": timestamp(),
        "sequenceNumber": next_sequence,
        "envelopeId": envelope.get("id").cloned().unwrap_or(Value::Null),
    });

    insert_or_replace(ensure_comms_array(comms, "messages"), message);
    insert_or_replace(ensure_comms_array(comms, "outbox"), envelope.clone());
    insert_or_replace(ensure_comms_array(comms, "deadDrops"), envelope);

    let conversations = ensure_comms_array(comms, "conversations");
    conversations[conversation_index]["sequenceNumber"] = json!(next_sequence);
    conversations[conversation_index]["updatedAt"] = json!(timestamp());
    conversations[conversation_index]["lastMessageAt"] = json!(timestamp());

    let drafts = ensure_comms_array(comms, "drafts");
    drafts.retain(|entry| entry.get("conversationId").and_then(Value::as_str) != Some(conversation_id));

    Ok(Value::Object(workspace_object))
}

pub fn fetch_relay_messages_in_workspace(workspace: Value, route_scope: Option<&str>) -> Result<Value, SecureCoreError> {
    let _ = route_scope;
    let mut workspace_object = workspace.as_object().cloned().ok_or(SecureCoreError::InvalidContainer)?;
    let comms = ensure_comms_object(&mut workspace_object);
    let identities = ensure_comms_array(comms, "identities").clone();
    let peers = ensure_comms_array(comms, "peers").clone();
    let conversations_snapshot = ensure_comms_array(comms, "conversations").clone();
    let dead_drops = ensure_comms_array(comms, "deadDrops").clone();
    let mut remaining = Vec::new();

    for envelope in dead_drops {
        let recipient_key_id = envelope.get("recipientKeyId").and_then(Value::as_str).unwrap_or_default();
        let Some(local_identity) = identities.iter().find(|entry| entry.get("keyId").and_then(Value::as_str) == Some(recipient_key_id)) else {
            remaining.push(envelope);
            continue;
        };

        let sender_key_id = envelope.get("senderKeyId").and_then(Value::as_str).unwrap_or_default();
        let Some(peer) = peers.iter().find(|entry| {
            entry.get("knownKeyIds")
                .and_then(Value::as_array)
                .map(|entries| entries.iter().any(|value| value.as_str() == Some(sender_key_id)))
                .unwrap_or(false)
        }) else {
            remaining.push(envelope);
            continue;
        };

        let conversation_id = envelope.get("conversationId").and_then(Value::as_str).unwrap_or_default();
        let sequence_number = envelope.get("sequenceNumber").and_then(Value::as_u64).unwrap_or(0);
        let payload = verify_and_open_message_payload(
            local_identity,
            &json!({
                "signingPublicKey": peer.get("signingPublicKey").cloned().unwrap_or(Value::Null),
                "encryptionPublicKey": peer.get("encryptionPublicKey").cloned().unwrap_or(Value::Null),
            }),
            conversation_id,
            sequence_number,
            envelope.get("nonce").and_then(Value::as_str).unwrap_or_default(),
            envelope.get("ciphertext").and_then(Value::as_str).unwrap_or_default(),
            envelope.get("signature").and_then(Value::as_str).unwrap_or_default(),
        );

        if let Ok(payload) = payload {
            let preview = preview_text(payload.get("body").and_then(Value::as_str).unwrap_or_default());
            let conversation_title = conversations_snapshot
                .iter()
                .find(|entry| entry.get("id").and_then(Value::as_str) == Some(conversation_id))
                .and_then(|entry| entry.get("title"))
                .cloned()
                .unwrap_or_else(|| json!("Conversation"));

            insert_or_replace(
                ensure_comms_array(comms, "messages"),
                json!({
                    "id": payload.get("messageId").cloned().unwrap_or_else(|| json!(short_random_id("message"))),
                    "conversationId": conversation_id,
                    "conversationTitle": conversation_title,
                    "direction": "inbound",
                    "senderKeyId": sender_key_id,
                    "recipientKeyId": recipient_key_id,
                    "preview": preview,
                    "attachmentCount": payload
                        .get("attachmentRefs")
                        .and_then(Value::as_array)
                        .map(|entries| entries.len())
                        .unwrap_or(0),
                    "status": "received",
                    "createdAt": envelope.get("createdAt").cloned().unwrap_or_else(|| json!(timestamp())),
                    "sequenceNumber": sequence_number,
                    "envelopeId": envelope.get("id").cloned().unwrap_or(Value::Null),
                }),
            );
            insert_or_replace(
                ensure_comms_array(comms, "receipts"),
                json!({
                    "id": short_random_id("receipt"),
                    "messageId": payload.get("messageId").cloned().unwrap_or(Value::Null),
                    "conversationId": conversation_id,
                    "status": "received",
                    "receivedAt": timestamp(),
                }),
            );
            if let Some(index) = conversations_snapshot
                .iter()
                .position(|entry| entry.get("id").and_then(Value::as_str) == Some(conversation_id))
            {
                let conversations = ensure_comms_array(comms, "conversations");
                conversations[index]["lastMessageAt"] = json!(timestamp());
                conversations[index]["updatedAt"] = json!(timestamp());
            }
        } else {
            remaining.push(envelope);
        }
    }

    *ensure_comms_array(comms, "deadDrops") = remaining;
    Ok(Value::Object(workspace_object))
}

pub fn attach_file_to_conversation_in_workspace(
    workspace: Value,
    conversation_id: &str,
    file_blob_id: &str,
    display_name: &str,
    media_type: &str,
    byte_length: u64,
    integrity_hash: &str,
) -> Result<Value, SecureCoreError> {
    let mut workspace_object = workspace.as_object().cloned().ok_or(SecureCoreError::InvalidContainer)?;
    let comms = ensure_comms_object(&mut workspace_object);
    let attachment = json!({
        "id": short_random_id("attachment"),
        "attachmentId": short_random_id("attachment"),
        "fileVaultBlobId": file_blob_id,
        "displayName": display_name,
        "mediaType": media_type,
        "byteLength": byte_length,
        "integrityHash": integrity_hash,
        "deletePolicy": "secure-delete",
        "sourceRecordType": "conversation",
        "sourceRecordId": conversation_id,
        "createdAt": timestamp(),
    });
    insert_or_replace(ensure_comms_array(comms, "attachmentRefs"), attachment);
    Ok(Value::Object(workspace_object))
}

pub fn delete_comms_message_in_workspace(
    workspace: Value,
    message_id: &str,
) -> Result<Value, SecureCoreError> {
    let mut workspace_object = workspace.as_object().cloned().ok_or(SecureCoreError::InvalidContainer)?;
    let comms = ensure_comms_object(&mut workspace_object);
    delete_by_id(ensure_comms_array(comms, "messages"), message_id);
    ensure_comms_array(comms, "outbox")
        .retain(|entry| entry.get("messageId").and_then(Value::as_str) != Some(message_id));
    ensure_comms_array(comms, "deadDrops")
        .retain(|entry| entry.get("messageId").and_then(Value::as_str) != Some(message_id));
    Ok(Value::Object(workspace_object))
}

pub fn delete_attachment_ref_in_workspace(
    workspace: Value,
    attachment_id: &str,
    mode: &str,
) -> Result<Value, SecureCoreError> {
    let mut workspace_object = workspace.as_object().cloned().ok_or(SecureCoreError::InvalidContainer)?;
    let comms = ensure_comms_object(&mut workspace_object);
    let attachments = ensure_comms_array(comms, "attachmentRefs").clone();
    if let Some(entry) = attachments
        .iter()
        .find(|entry| entry.get("id").and_then(Value::as_str) == Some(attachment_id))
        .and_then(|entry| entry.get("fileVaultBlobId"))
        .and_then(Value::as_str)
    {
        let _ = delete_file_blob(entry, mode);
    }
    delete_by_id(ensure_comms_array(comms, "attachmentRefs"), attachment_id);
    Ok(Value::Object(workspace_object))
}

pub fn export_snapshot_file(workspace: &Value, target_path: &str, passphrase: &str) -> Result<String, SecureCoreError> {
    let mut salt = [0_u8; SALT_LENGTH];
    OsRng.fill_bytes(&mut salt);
    let mut root_key = derive_root_key(passphrase, &salt)?;
    let payload_bytes =
        serde_json::to_vec(workspace).map_err(|error| SecureCoreError::Serde(error.to_string()))?;
    let payload = encrypt_bytes(&root_key, &payload_bytes)?;
    root_key.zeroize();

    let snapshot = NativeSnapshotContainer {
        kind: SNAPSHOT_KIND.to_string(),
        version: CONTAINER_VERSION,
        product: PRODUCT_NAME.to_string(),
        exported_at: timestamp(),
        payload: EncryptedBlob {
            nonce: payload.nonce,
            ciphertext: format!("{}:{}", BASE64.encode(salt), payload.ciphertext),
        },
    };

    let serialized =
        serde_json::to_string_pretty(&snapshot).map_err(|error| SecureCoreError::Serde(error.to_string()))?;
    fs::write(target_path, serialized).map_err(|error| SecureCoreError::Io(error.to_string()))?;
    Ok(target_path.to_string())
}

pub fn import_snapshot_file(source_path: &str, passphrase: &str) -> Result<Value, SecureCoreError> {
    let content = fs::read_to_string(source_path).map_err(|error| SecureCoreError::Io(error.to_string()))?;
    let snapshot: NativeSnapshotContainer =
        serde_json::from_str(&content).map_err(|error| SecureCoreError::Serde(error.to_string()))?;
    if snapshot.kind != SNAPSHOT_KIND {
        return Err(SecureCoreError::InvalidContainer);
    }
    let (salt_b64, ciphertext) = snapshot
        .payload
        .ciphertext
        .split_once(':')
        .ok_or(SecureCoreError::InvalidContainer)?;
    let salt = BASE64.decode(salt_b64).map_err(|_| SecureCoreError::InvalidContainer)?;
    let mut root_key = derive_root_key(passphrase, &salt)?;
    let payload = EncryptedBlob {
        nonce: snapshot.payload.nonce,
        ciphertext: ciphertext.to_string(),
    };
    let workspace_bytes = decrypt_bytes(&root_key, &payload)?;
    root_key.zeroize();
    serde_json::from_slice(&workspace_bytes).map_err(|error| SecureCoreError::Serde(error.to_string()))
}

pub fn migrate_beta_workspace_file(
    _source_kind: &str,
    passphrase: &str,
    legacy_workspace: Value,
) -> Result<UnlockedWorkspace, SecureCoreError> {
    let marker = beta_marker_path()?;
    if let Some(parent) = marker.parent() {
        fs::create_dir_all(parent).map_err(|error| SecureCoreError::Io(error.to_string()))?;
    }
    fs::write(&marker, b"migrated").map_err(|error| SecureCoreError::Io(error.to_string()))?;
    initialize_workspace_file(passphrase, json!({}), Some(legacy_workspace))
}

pub fn search_workspace_records(
    workspace: &Value,
    query: &str,
    scope: Option<&HashSet<String>>,
) -> Result<Value, SecureCoreError> {
    let lowered = query.trim().to_lowercase();
    if lowered.is_empty() {
        return Ok(json!([]));
    }

    let mut results = Vec::new();

    for definition in list_compartment_defs() {
        if let Some(scope_values) = scope {
            if !scope_values.contains(definition.id) {
                continue;
            }
        }

        let compartment = compartment_value(workspace, definition.id)?;
        for entry in build_safe_search_index(definition.id, &compartment) {
            if entry.to_lowercase().contains(&lowered) {
                results.push(json!({
                    "compartmentId": definition.id,
                    "label": definition.label,
                    "value": entry,
                }));
            }
        }
    }

    Ok(Value::Array(results))
}

pub fn store_record_in_workspace(
    workspace: Value,
    compartment_id: &str,
    record: Value,
) -> Result<Value, SecureCoreError> {
    let mut object = workspace.as_object().cloned().ok_or(SecureCoreError::InvalidContainer)?;
    let list_key = match compartment_id {
        "notes_vault" => "notes",
        "identity_vault" => "profiles",
        "wallet_vault" => "wallets",
        "calendar_refs_vault" => return Err(SecureCoreError::UnsupportedCompartment(compartment_id.to_string())),
        "operator_profiles_vault" => {
            object.insert("settings".to_string(), record);
            return Ok(Value::Object(object));
        }
        _ => return Err(SecureCoreError::UnsupportedCompartment(compartment_id.to_string())),
    };

    let record_id = record
        .get("id")
        .and_then(Value::as_str)
        .ok_or(SecureCoreError::InvalidRecordId)?
        .to_string();

    let mut records = object
        .remove(list_key)
        .and_then(|value| value.as_array().cloned())
        .unwrap_or_default();

    if let Some(index) = records
        .iter()
        .position(|entry| entry.get("id").and_then(Value::as_str) == Some(record_id.as_str()))
    {
        records[index] = record;
    } else {
        records.push(record);
    }

    object.insert(list_key.to_string(), Value::Array(records));
    Ok(Value::Object(object))
}

pub fn delete_record_from_workspace(
    workspace: Value,
    compartment_id: &str,
    record_id: &str,
) -> Result<Value, SecureCoreError> {
    let mut object = workspace.as_object().cloned().ok_or(SecureCoreError::InvalidContainer)?;
    let list_key = match compartment_id {
        "notes_vault" => "notes",
        "identity_vault" => "profiles",
        "wallet_vault" => "wallets",
        "calendar_refs_vault" => return Err(SecureCoreError::UnsupportedCompartment(compartment_id.to_string())),
        "operator_profiles_vault" => return Err(SecureCoreError::UnsupportedCompartment(compartment_id.to_string())),
        _ => return Err(SecureCoreError::UnsupportedCompartment(compartment_id.to_string())),
    };

    let records = object
        .remove(list_key)
        .and_then(|value| value.as_array().cloned())
        .unwrap_or_default()
        .into_iter()
        .filter(|entry| entry.get("id").and_then(Value::as_str) != Some(record_id))
        .collect::<Vec<_>>();

    object.insert(list_key.to_string(), Value::Array(records));
    Ok(Value::Object(object))
}
