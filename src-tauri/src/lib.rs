mod secure_core;
mod lan_party;
mod license;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use once_cell::sync::Lazy;
use rusqlite::{Connection, OpenFlags};
use secure_core::{
    export_snapshot_file, import_snapshot_file, initialize_workspace_file, list_compartment_defs,
    lock_session, persist_workspace_file, read_vault_state, remove_workspace_file, search_workspace_records,
    unlock_compartment_gate, unlock_workspace_file, migrate_beta_workspace_file, NativeVaultState,
    UnlockedWorkspace, store_file_blob, read_file_blob, delete_file_blob, list_file_blobs,
    purge_orphaned_lattice_blocks,
    create_comms_identity_in_workspace, rotate_comms_identity_in_workspace, export_identity_card_from_workspace,
    import_peer_card_into_workspace, verify_peer_in_workspace, create_conversation_in_workspace,
    save_comms_draft_in_workspace, send_comms_message_in_workspace, fetch_relay_messages_in_workspace,
    attach_file_to_conversation_in_workspace, delete_comms_message_in_workspace, delete_attachment_ref_in_workspace,
    IdentityCardExportResult, save_nostr_secret_key, load_nostr_secret_key, delete_nostr_secret_key,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashSet;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use tauri::{LogicalSize, Manager};

static SESSION: Lazy<Mutex<Option<UnlockedWorkspace>>> = Lazy::new(|| Mutex::new(None));

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct VaultStateResponse {
    backend: &'static str,
    lifecycle: String,
    boot: Value,
    compartments: Vec<CompartmentDescriptor>,
    sensitive_compartments: Vec<String>,
    beta_workspace_detected: bool,
    keystore_available: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct CompartmentDescriptor {
    id: String,
    label: String,
    sensitivity: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InitializeWorkspaceArgs {
    passphrase: String,
    operator_profile: Option<Value>,
    workspace: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UnlockWorkspaceArgs {
    passphrase: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InstallLicenseArgs {
    key: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CheckFeatureArgs {
    feature_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UnlockCompartmentArgs {
    compartment_id: String,
    intent: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistWorkspaceArgs {
    workspace: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoreRecordArgs {
    compartment_id: String,
    record: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeleteRecordArgs {
    compartment_id: String,
    record_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveNostrSecretArgs {
    pubkey: String,
    secret_hex: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LoadNostrSecretArgs {
    pubkey: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NostrSecretResponse {
    pubkey: String,
    secret_hex: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SearchWorkspaceArgs {
    query: String,
    scope: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportSnapshotArgs {
    target_path: String,
    passphrase: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImportSnapshotArgs {
    source_path: String,
    passphrase: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MigrateBetaWorkspaceArgs {
    source_kind: String,
    passphrase: String,
    legacy_workspace: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoreFileBlobArgs {
    blob_id: String,
    mime_type: String,
    payload_base64: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReadFileBlobArgs {
    blob_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeleteFileBlobArgs {
    blob_id: String,
    mode: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileBlobResponse {
    mime_type: String,
    payload_base64: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileBlobDescriptorResponse {
    blob_id: String,
    mime_type: String,
    stored_at: String,
    size_bytes: u64,
    storage_mode: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PurgeOrphanedFileBlobsResponse {
    removed: usize,
    failed: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PrinterCapabilityResponse {
    platform: String,
    printers: Vec<PrinterDescriptorResponse>,
    warnings: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PrinterDescriptorResponse {
    name: String,
    driver: String,
    status: String,
    is_default: bool,
    device_uri: String,
    options: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SpeakAccessibilityArgs {
    text: String,
    enabled: Option<bool>,
    voice: Option<String>,
    rate: Option<u16>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveTextFileDialogArgs {
    suggested_name: String,
    content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EnableLanPartyArgs {
    enabled: bool,
    codename: Option<String>,
    operator: Option<String>,
    default_status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GetLanPartyStateArgs {
    codename: Option<String>,
    operator: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ScanLanPeersArgs {
    target_ip: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetLanPresenceArgs {
    status: Option<String>,
    role: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SendLanChatArgs {
    content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ShareLanNoteArgs {
    note_id: String,
    title: String,
    excerpt: String,
    body: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpsertLanQueueArgs {
    item: lan_party::LanQueueItem,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SendLanFileArgs {
    name: String,
    content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateCommsIdentityArgs {
    profile_id: String,
    display_name: String,
    relay_hints: Option<Vec<String>>,
    direct_hints: Option<Vec<String>>,
    network_policy: Option<Value>,
    trust_policy: Option<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RotateCommsIdentityArgs {
    identity_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportIdentityCardArgs {
    identity_id: String,
    target_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImportPeerCardArgs {
    source: String,
    trust_mode: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VerifyPeerArgs {
    peer_id: String,
    fingerprint: String,
    key_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateConversationArgs {
    local_identity_id: String,
    peer_id: String,
    title: Option<String>,
    tags: Option<Vec<String>>,
    require_verified_peer: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConversationIdArgs {
    conversation_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveDraftArgs {
    conversation_id: String,
    draft: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SendMessageArgs {
    conversation_id: String,
    draft: Value,
    delivery_mode: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FetchRelayMessagesArgs {
    route_scope: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AttachFileArgs {
    conversation_id: String,
    file_blob_id: String,
    display_name: String,
    media_type: String,
    byte_length: u64,
    integrity_hash: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeleteMessageArgs {
    message_id: String,
    delete_mode: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeleteAttachmentRefArgs {
    attachment_id: String,
    delete_mode: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OpenTextFileDialogArgs {
    allow_extensions: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DialogTextFileResponse {
    path: String,
    name: String,
    content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CalibreMetadataRecord {
    title: String,
    authors: Vec<String>,
    tags: Vec<String>,
    identifiers: Vec<String>,
    publisher: String,
    series: String,
    series_index: String,
    language: String,
    published_at: String,
    description: String,
    cover_data_url: String,
    available_formats: Vec<String>,
    source_path: String,
    updated_at: String,
}

fn split_catalog_list(value: &str) -> Vec<String> {
    value
        .split(" | ")
        .map(|entry| entry.trim())
        .filter(|entry| !entry.is_empty())
        .map(|entry| entry.to_string())
        .collect()
}

fn load_cover_data_url(db_path: &std::path::Path, relative_book_path: &str, has_cover: bool) -> String {
    if !has_cover {
        return String::new();
    }

    let Some(root) = db_path.parent() else {
        return String::new();
    };

    let cover_path = root.join(relative_book_path).join("cover.jpg");
    let Ok(bytes) = fs::read(cover_path) else {
        return String::new();
    };

    format!("data:image/jpeg;base64,{}", BASE64.encode(bytes))
}

fn descriptors() -> Vec<CompartmentDescriptor> {
    list_compartment_defs()
        .into_iter()
        .map(|definition| CompartmentDescriptor {
            id: definition.id.to_string(),
            label: definition.label.to_string(),
            sensitivity: definition.sensitivity.to_string(),
        })
        .collect()
}

fn sensitive_compartment_ids() -> Vec<String> {
    list_compartment_defs()
        .into_iter()
        .filter(|definition| definition.sensitivity != "standard")
        .map(|definition| definition.id.to_string())
        .collect()
}

#[tauri::command]
fn get_vault_state() -> Result<VaultStateResponse, String> {
    let NativeVaultState {
        lifecycle,
        boot,
        beta_workspace_detected,
        keystore_available,
    } = read_vault_state().map_err(|error| error.to_string())?;

    Ok(VaultStateResponse {
        backend: "tauri-native",
        lifecycle,
        boot,
        compartments: descriptors(),
        sensitive_compartments: sensitive_compartment_ids(),
        beta_workspace_detected,
        keystore_available,
    })
}

#[tauri::command]
fn get_license_state() -> Result<license::LicenseState, String> {
    Ok(license::current_license())
}

#[tauri::command]
fn install_license_key(args: InstallLicenseArgs) -> Result<license::LicenseState, String> {
    license::install_license_key(&args.key)
}

#[tauri::command]
fn remove_license() -> Result<license::LicenseState, String> {
    license::remove_license()
}

#[tauri::command]
fn check_feature(args: CheckFeatureArgs) -> Result<license::FeatureCheck, String> {
    Ok(license::check_feature(&args.feature_id))
}

#[tauri::command]
fn initialize_workspace(args: InitializeWorkspaceArgs) -> Result<Value, String> {
    let unlocked = initialize_workspace_file(
        &args.passphrase,
        args.operator_profile.unwrap_or(Value::Null),
        args.workspace,
    )
    .map_err(|error| error.to_string())?;
    let workspace = unlocked.workspace.clone();
    *SESSION.lock().map_err(|_| "Session lock poisoned".to_string())? = Some(unlocked);
    Ok(workspace)
}

#[tauri::command]
fn unlock_workspace(args: UnlockWorkspaceArgs) -> Result<Value, String> {
    let unlocked = unlock_workspace_file(&args.passphrase).map_err(|error| error.to_string())?;
    let workspace = unlocked.workspace.clone();
    *SESSION.lock().map_err(|_| "Session lock poisoned".to_string())? = Some(unlocked);
    Ok(workspace)
}

#[tauri::command]
fn lock_workspace() -> Result<(), String> {
    let mut guard = SESSION
        .lock()
        .map_err(|_| "Session lock poisoned".to_string())?;
    lock_session(&mut guard);
    Ok(())
}

#[tauri::command]
fn list_compartments() -> Result<Vec<CompartmentDescriptor>, String> {
    Ok(descriptors())
}

#[tauri::command]
fn unlock_compartment(args: UnlockCompartmentArgs) -> Result<Vec<String>, String> {
    let mut guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_mut().ok_or_else(|| "Workspace is locked.".to_string())?;
    unlock_compartment_gate(session, &args.compartment_id, args.intent.as_deref()).map_err(|error| error.to_string())?;
    Ok(session.unlocked_compartments.iter().cloned().collect())
}

#[tauri::command]
fn persist_workspace(args: PersistWorkspaceArgs) -> Result<Value, String> {
    let mut guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_mut().ok_or_else(|| "Workspace is locked.".to_string())?;
    session.workspace = args.workspace;
    persist_workspace_file(session).map_err(|error| error.to_string())?;
    Ok(session.workspace.clone())
}

#[tauri::command]
fn store_record(args: StoreRecordArgs) -> Result<Value, String> {
    let mut guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_mut().ok_or_else(|| "Workspace is locked.".to_string())?;
    let workspace = secure_core::store_record_in_workspace(
        session.workspace.clone(),
        &args.compartment_id,
        args.record,
    )
    .map_err(|error| error.to_string())?;
    session.workspace = workspace;
    persist_workspace_file(session).map_err(|error| error.to_string())?;
    Ok(session.workspace.clone())
}

#[tauri::command]
fn delete_record(args: DeleteRecordArgs) -> Result<Value, String> {
    let mut guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_mut().ok_or_else(|| "Workspace is locked.".to_string())?;
    let workspace = secure_core::delete_record_from_workspace(
        session.workspace.clone(),
        &args.compartment_id,
        &args.record_id,
    )
    .map_err(|error| error.to_string())?;
    session.workspace = workspace;
    persist_workspace_file(session).map_err(|error| error.to_string())?;
    Ok(session.workspace.clone())
}

#[tauri::command]
fn save_nostr_secret(args: SaveNostrSecretArgs) -> Result<(), String> {
    save_nostr_secret_key(&args.pubkey, &args.secret_hex).map_err(|error| error.to_string())
}

#[tauri::command]
fn load_nostr_secret(args: LoadNostrSecretArgs) -> Result<NostrSecretResponse, String> {
    let secret_hex = load_nostr_secret_key(&args.pubkey).map_err(|error| error.to_string())?;
    Ok(NostrSecretResponse {
        pubkey: args.pubkey,
        secret_hex,
    })
}

#[tauri::command]
fn delete_nostr_secret(args: LoadNostrSecretArgs) -> Result<(), String> {
    delete_nostr_secret_key(&args.pubkey).map_err(|error| error.to_string())
}

#[tauri::command]
fn search_workspace(args: SearchWorkspaceArgs) -> Result<Value, String> {
    let guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_ref().ok_or_else(|| "Workspace is locked.".to_string())?;
    let scope = args
        .scope
        .map(|entries| entries.into_iter().collect::<HashSet<_>>());
    search_workspace_records(&session.workspace, &args.query, scope.as_ref()).map_err(|error| error.to_string())
}

#[tauri::command]
fn export_snapshot(args: ExportSnapshotArgs) -> Result<String, String> {
    let guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_ref().ok_or_else(|| "Workspace is locked.".to_string())?;
    export_snapshot_file(&session.workspace, &args.target_path, &args.passphrase).map_err(|error| error.to_string())
}

#[tauri::command]
fn import_snapshot(args: ImportSnapshotArgs) -> Result<Value, String> {
    let mut guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let workspace = import_snapshot_file(&args.source_path, &args.passphrase).map_err(|error| error.to_string())?;
    let session = guard.as_mut().ok_or_else(|| "Workspace is locked.".to_string())?;
    session.workspace = workspace;
    persist_workspace_file(session).map_err(|error| error.to_string())?;
    Ok(session.workspace.clone())
}

#[tauri::command]
fn migrate_beta_workspace(args: MigrateBetaWorkspaceArgs) -> Result<Value, String> {
    let unlocked = migrate_beta_workspace_file(&args.source_kind, &args.passphrase, args.legacy_workspace)
        .map_err(|error| error.to_string())?;
    let workspace = unlocked.workspace.clone();
    *SESSION.lock().map_err(|_| "Session lock poisoned".to_string())? = Some(unlocked);
    Ok(workspace)
}

#[tauri::command]
fn store_file_blob_command(args: StoreFileBlobArgs) -> Result<(), String> {
    let payload = BASE64
        .decode(&args.payload_base64)
        .map_err(|_| "Unable to decode file payload.".to_string())?;
    let guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_ref().ok_or_else(|| "Workspace is locked.".to_string())?;
    store_file_blob(session, &args.blob_id, &args.mime_type, &payload).map_err(|error| error.to_string())
}

#[tauri::command]
fn read_file_blob_command(args: ReadFileBlobArgs) -> Result<FileBlobResponse, String> {
    let guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_ref().ok_or_else(|| "Workspace is locked.".to_string())?;
    let (mime_type, payload_base64) =
        read_file_blob(session, &args.blob_id).map_err(|error| error.to_string())?;
    Ok(FileBlobResponse {
        mime_type,
        payload_base64,
    })
}

#[tauri::command]
fn delete_file_blob_command(args: DeleteFileBlobArgs) -> Result<(), String> {
    delete_file_blob(&args.blob_id, args.mode.as_deref().unwrap_or("standard-delete"))
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn purge_orphaned_file_blobs_command(args: DeleteFileBlobArgs) -> Result<PurgeOrphanedFileBlobsResponse, String> {
    let guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_ref().ok_or_else(|| "Workspace is locked.".to_string())?;
    let workspace = &session.workspace;

    let mut linked_blob_ids = HashSet::new();

    if let Some(library) = workspace.get("library").and_then(Value::as_array) {
        for entry in library {
            if let Some(blob_id) = entry.get("fileVaultId").and_then(Value::as_str) {
                if !blob_id.trim().is_empty() {
                    linked_blob_ids.insert(blob_id.to_string());
                }
            }
        }
    }

    if let Some(attachments) = workspace
        .get("comms")
        .and_then(|comms| comms.get("attachmentRefs"))
        .and_then(Value::as_array)
    {
        for attachment in attachments {
            if let Some(blob_id) = attachment.get("fileVaultBlobId").and_then(Value::as_str) {
                if !blob_id.trim().is_empty() {
                    linked_blob_ids.insert(blob_id.to_string());
                }
            }
        }
    }

    let mode = args.mode.as_deref().unwrap_or("standard-delete");
    let mut removed = 0_usize;
    let mut failed = 0_usize;

    for entry in list_file_blobs().map_err(|error| error.to_string())? {
        if linked_blob_ids.contains(&entry.blob_id) {
            continue;
        }

        match delete_file_blob(&entry.blob_id, mode) {
            Ok(_) => removed += 1,
            Err(_) => failed += 1,
        }
    }

    let (removed_block_dirs, failed_block_dirs) =
        purge_orphaned_lattice_blocks(&linked_blob_ids, mode).map_err(|error| error.to_string())?;
    removed += removed_block_dirs;
    failed += failed_block_dirs;

    Ok(PurgeOrphanedFileBlobsResponse { removed, failed })
}

#[tauri::command]
fn list_file_blobs_command() -> Result<Vec<FileBlobDescriptorResponse>, String> {
    list_file_blobs()
        .map(|entries| {
            entries
                .into_iter()
                .map(|entry| FileBlobDescriptorResponse {
                    blob_id: entry.blob_id,
                    mime_type: entry.mime_type,
                    stored_at: entry.stored_at,
                    size_bytes: entry.size_bytes,
                    storage_mode: entry.storage_mode,
                })
                .collect()
        })
        .map_err(|error| error.to_string())
}

fn command_output(program: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new(program)
        .args(args)
        .output()
        .map_err(|error| format!("{program} is unavailable: {error}"))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if message.is_empty() {
            format!("{program} exited with status {}", output.status)
        } else {
            message
        })
    }
}

fn parse_windows_printers(raw: &str) -> Vec<PrinterDescriptorResponse> {
    let Ok(value) = serde_json::from_str::<Value>(raw) else {
        return Vec::new();
    };

    let entries = match value {
        Value::Array(entries) => entries,
        Value::Object(_) => vec![value],
        _ => Vec::new(),
    };

    entries
        .into_iter()
        .map(|entry| PrinterDescriptorResponse {
            name: entry
                .get("Name")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            driver: entry
                .get("DriverName")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            status: entry
                .get("PrinterStatus")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            is_default: entry.get("Default").and_then(Value::as_bool).unwrap_or(false),
            device_uri: entry
                .get("PortName")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string(),
            options: Vec::new(),
        })
        .filter(|entry| !entry.name.is_empty())
        .collect()
}

fn list_cups_printers() -> PrinterCapabilityResponse {
    let platform = std::env::consts::OS.to_string();
    let mut warnings = Vec::new();
    let names = match command_output("lpstat", &["-e"]) {
        Ok(output) => output
            .lines()
            .map(str::trim)
            .filter(|entry| !entry.is_empty())
            .map(ToString::to_string)
            .collect::<Vec<_>>(),
        Err(error) => {
            warnings.push(error);
            Vec::new()
        }
    };
    let default_printer = command_output("lpstat", &["-d"])
        .ok()
        .and_then(|output| output.split(':').nth(1).map(str::trim).map(ToString::to_string))
        .unwrap_or_default();

    let printers = names
        .into_iter()
        .map(|name| {
            let device_uri = command_output("lpstat", &["-v", &name])
                .ok()
                .and_then(|output| output.split(':').nth(1).map(str::trim).map(ToString::to_string))
                .unwrap_or_default();
            let options = command_output("lpoptions", &["-p", &name, "-l"])
                .map(|output| output.lines().take(32).map(ToString::to_string).collect())
                .unwrap_or_default();

            PrinterDescriptorResponse {
                name: name.clone(),
                driver: String::new(),
                status: String::new(),
                is_default: name == default_printer,
                device_uri,
                options,
            }
        })
        .collect();

    PrinterCapabilityResponse {
        platform,
        printers,
        warnings,
    }
}

#[tauri::command]
fn list_accessibility_printers() -> Result<PrinterCapabilityResponse, String> {
    if cfg!(target_os = "windows") {
        let raw = command_output(
            "powershell",
            &[
                "-NoProfile",
                "-Command",
                "Get-Printer | Select-Object Name,DriverName,PrinterStatus,Default,PortName | ConvertTo-Json -Compress",
            ],
        )?;
        return Ok(PrinterCapabilityResponse {
            platform: "windows".to_string(),
            printers: parse_windows_printers(&raw),
            warnings: Vec::new(),
        });
    }

    Ok(list_cups_printers())
}

fn voice_script_candidates(app: &tauri::AppHandle) -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("accessibility_voice.py"));
        candidates.push(resource_dir.join("scripts").join("accessibility_voice.py"));
    }

    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir.join("scripts").join("accessibility_voice.py"));
        if let Some(parent) = current_dir.parent() {
            candidates.push(parent.join("scripts").join("accessibility_voice.py"));
        }
    }

    candidates
}

#[tauri::command]
fn speak_accessibility_prompt(app: tauri::AppHandle, args: SpeakAccessibilityArgs) -> Result<(), String> {
    if !args.enabled.unwrap_or(false) {
        return Ok(());
    }

    let text = args.text.trim();
    if text.is_empty() {
        return Ok(());
    }

    let Some(script_path) = voice_script_candidates(&app).into_iter().find(|path| path.exists()) else {
        return Err("Local Python voice helper is unavailable.".to_string());
    };

    let payload = json!({
        "text": text,
        "voice": args.voice.unwrap_or_default(),
        "rate": args.rate.unwrap_or(175),
    });
    let python = if cfg!(target_os = "windows") { "python" } else { "python3" };
    let mut child = Command::new(python)
        .arg(script_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Unable to start local Python voice helper: {error}"))?;

    if let Some(stdin) = child.stdin.as_mut() {
        stdin
            .write_all(payload.to_string().as_bytes())
            .map_err(|error| format!("Unable to send speech payload: {error}"))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|error| format!("Unable to finish local speech request: {error}"))?;

    if output.status.success() {
        Ok(())
    } else {
        let message = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if message.is_empty() {
            "Local speech request failed.".to_string()
        } else {
            message
        })
    }
}

#[tauri::command]
fn save_text_file_dialog(args: SaveTextFileDialogArgs) -> Result<Option<String>, String> {
    let selected_path = rfd::FileDialog::new()
        .set_title("Export encrypted ROS bundle")
        .set_file_name(&args.suggested_name)
        .add_filter("ROS encrypted bundle", &["osae"])
        .save_file();

    let Some(path) = selected_path else {
        return Ok(None);
    };

    fs::write(&path, args.content).map_err(|error| format!("Unable to save file: {error}"))?;
    Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn get_lan_party_state(args: GetLanPartyStateArgs) -> Result<lan_party::LanPartyState, String> {
    Ok(lan_party::get_state(args.codename, args.operator))
}

#[tauri::command]
fn set_lan_party_enabled(args: EnableLanPartyArgs) -> Result<lan_party::LanPartyState, String> {
    if args.enabled {
        license::require_feature("fsociety_lan")?;
    }

    Ok(lan_party::set_enabled(lan_party::EnableLanArgs {
        enabled: args.enabled,
        codename: args.codename,
        operator: args.operator,
        default_status: args.default_status,
    }))
}

#[tauri::command]
fn scan_lan_peers(args: ScanLanPeersArgs) -> Result<lan_party::LanPartyState, String> {
    Ok(lan_party::scan(lan_party::ScanLanArgs {
        target_ip: args.target_ip,
    }))
}

#[tauri::command]
fn set_lan_presence(args: SetLanPresenceArgs) -> Result<lan_party::LanPartyState, String> {
    Ok(lan_party::set_presence(lan_party::PresenceArgs {
        status: args.status,
        role: args.role,
    }))
}

#[tauri::command]
fn send_lan_chat(args: SendLanChatArgs) -> Result<lan_party::LanPartyState, String> {
    Ok(lan_party::send_chat(lan_party::SendChatArgs {
        content: args.content,
    }))
}

#[tauri::command]
fn share_lan_note(args: ShareLanNoteArgs) -> Result<lan_party::LanPartyState, String> {
    Ok(lan_party::share_note(lan_party::ShareNoteArgs {
        note_id: args.note_id,
        title: args.title,
        excerpt: args.excerpt,
        body: args.body,
    }))
}

#[tauri::command]
fn upsert_lan_queue_item(args: UpsertLanQueueArgs) -> Result<lan_party::LanPartyState, String> {
    Ok(lan_party::upsert_queue(lan_party::UpsertQueueArgs {
        item: args.item,
    }))
}

#[tauri::command]
fn send_lan_file(args: SendLanFileArgs) -> Result<lan_party::LanPartyState, String> {
    Ok(lan_party::send_file(lan_party::SendFileArgs {
        name: args.name,
        content: args.content,
    }))
}

#[tauri::command]
fn open_text_file_dialog(args: OpenTextFileDialogArgs) -> Result<Option<DialogTextFileResponse>, String> {
    let mut dialog = rfd::FileDialog::new().set_title("Import ROS bundle");

    if let Some(extensions) = args.allow_extensions {
        let owned: Vec<String> = extensions
            .into_iter()
            .filter(|entry| !entry.trim().is_empty())
            .collect();

        if !owned.is_empty() {
            let refs: Vec<&str> = owned.iter().map(|entry| entry.as_str()).collect();
            dialog = dialog.add_filter("ROS bundle", &refs);
        }
    }

    let Some(path) = dialog.pick_file() else {
        return Ok(None);
    };

    let content =
        fs::read_to_string(&path).map_err(|error| format!("Unable to read selected file: {error}"))?;

    Ok(Some(DialogTextFileResponse {
        path: path.to_string_lossy().to_string(),
        name: path
            .file_name()
            .map(|value| value.to_string_lossy().to_string())
            .unwrap_or_else(|| "selected-file".to_string()),
        content,
    }))
}

#[tauri::command]
fn import_calibre_metadata_db() -> Result<Option<Vec<CalibreMetadataRecord>>, String> {
    let Some(path) = rfd::FileDialog::new()
        .set_title("Import Calibre metadata.db")
        .add_filter("Calibre catalog", &["db"])
        .set_file_name("metadata.db")
        .pick_file()
    else {
        return Ok(None);
    };

    let connection = Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| format!("Unable to open metadata.db: {error}"))?;

    let mut statement = connection
        .prepare(
            "
            SELECT
              books.title AS title,
              COALESCE(
                (
                  SELECT group_concat(authors.name, ' | ')
                  FROM books_authors_link
                  JOIN authors ON books_authors_link.author = authors.id
                  WHERE books_authors_link.book = books.id
                ),
                ''
              ) AS authors,
              COALESCE(
                (
                  SELECT group_concat(tags.name, ' | ')
                  FROM books_tags_link
                  JOIN tags ON books_tags_link.tag = tags.id
                  WHERE books_tags_link.book = books.id
                ),
                ''
              ) AS tags,
              COALESCE(
                (
                  SELECT group_concat(identifiers.type || ':' || identifiers.val, ' | ')
                  FROM identifiers
                  WHERE identifiers.book = books.id
                ),
                ''
              ) AS identifiers,
              COALESCE(
                (
                  SELECT publishers.name
                  FROM books_publishers_link
                  JOIN publishers ON books_publishers_link.publisher = publishers.id
                  WHERE books_publishers_link.book = books.id
                  LIMIT 1
                ),
                ''
              ) AS publisher,
              COALESCE(
                (
                  SELECT series.name
                  FROM books_series_link
                  JOIN series ON books_series_link.series = series.id
                  WHERE books_series_link.book = books.id
                  LIMIT 1
                ),
                ''
              ) AS series,
              COALESCE(CAST(books.series_index AS TEXT), '') AS series_index,
              COALESCE(
                (
                  SELECT group_concat(languages.lang_code, ' | ')
                  FROM books_languages_link
                  JOIN languages ON books_languages_link.lang_code = languages.id
                  WHERE books_languages_link.book = books.id
                ),
                ''
              ) AS language,
              COALESCE(CAST(books.pubdate AS TEXT), '') AS published_at,
              COALESCE(
                (
                  SELECT comments.text
                  FROM comments
                  WHERE comments.book = books.id
                  LIMIT 1
                ),
                ''
              ) AS description,
              COALESCE(
                (
                  SELECT group_concat(data.format, ' | ')
                  FROM data
                  WHERE data.book = books.id
                ),
                ''
              ) AS available_formats,
              COALESCE(books.path, '') AS source_path,
              COALESCE(CAST(books.last_modified AS TEXT), '') AS updated_at,
              COALESCE(books.has_cover, 0) AS has_cover
            FROM books
            ORDER BY books.last_modified DESC, books.id DESC
            ",
        )
        .map_err(|error| format!("Unable to read Calibre catalog: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            let source_path: String = row.get("source_path")?;
            let has_cover = row.get::<_, i64>("has_cover").unwrap_or(0) > 0;

            Ok(CalibreMetadataRecord {
                title: row.get::<_, String>("title")?,
                authors: split_catalog_list(&row.get::<_, String>("authors")?),
                tags: split_catalog_list(&row.get::<_, String>("tags")?),
                identifiers: split_catalog_list(&row.get::<_, String>("identifiers")?),
                publisher: row.get::<_, String>("publisher")?,
                series: row.get::<_, String>("series")?,
                series_index: row.get::<_, String>("series_index")?,
                language: split_catalog_list(&row.get::<_, String>("language")?).join(", "),
                published_at: row.get::<_, String>("published_at")?,
                description: row.get::<_, String>("description")?,
                cover_data_url: load_cover_data_url(&path, &source_path, has_cover),
                available_formats: split_catalog_list(&row.get::<_, String>("available_formats")?),
                source_path,
                updated_at: row.get::<_, String>("updated_at")?,
            })
        })
        .map_err(|error| format!("Unable to map Calibre records: {error}"))?;

    let mut records = Vec::new();
    for row in rows {
        records.push(row.map_err(|error| format!("Unable to read Calibre record: {error}"))?);
    }

    Ok(Some(records))
}

#[tauri::command]
fn create_comms_identity(args: CreateCommsIdentityArgs) -> Result<Value, String> {
    let mut guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_mut().ok_or_else(|| "Workspace is locked.".to_string())?;
    session.workspace = create_comms_identity_in_workspace(
        session.workspace.clone(),
        &args.profile_id,
        &args.display_name,
        args.relay_hints.unwrap_or_default(),
        args.direct_hints.unwrap_or_default(),
        args.network_policy.unwrap_or_else(|| json!({})),
        args.trust_policy.unwrap_or_else(|| json!({})),
    )
    .map_err(|error| error.to_string())?;
    persist_workspace_file(session).map_err(|error| error.to_string())?;
    Ok(session.workspace.clone())
}

#[tauri::command]
fn rotate_comms_identity(args: RotateCommsIdentityArgs) -> Result<Value, String> {
    let mut guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_mut().ok_or_else(|| "Workspace is locked.".to_string())?;
    session.workspace =
        rotate_comms_identity_in_workspace(session.workspace.clone(), &args.identity_id)
            .map_err(|error| error.to_string())?;
    persist_workspace_file(session).map_err(|error| error.to_string())?;
    Ok(session.workspace.clone())
}

#[tauri::command]
fn export_identity_card(args: ExportIdentityCardArgs) -> Result<IdentityCardExportResult, String> {
    let guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_ref().ok_or_else(|| "Workspace is locked.".to_string())?;
    export_identity_card_from_workspace(&session.workspace, &args.identity_id, args.target_path.as_deref())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn import_peer_card(args: ImportPeerCardArgs) -> Result<Value, String> {
    let mut guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_mut().ok_or_else(|| "Workspace is locked.".to_string())?;
    session.workspace = import_peer_card_into_workspace(
        session.workspace.clone(),
        &args.source,
        args.trust_mode.as_deref(),
    )
    .map_err(|error| error.to_string())?;
    persist_workspace_file(session).map_err(|error| error.to_string())?;
    Ok(session.workspace.clone())
}

#[tauri::command]
fn verify_peer(args: VerifyPeerArgs) -> Result<Value, String> {
    let mut guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_mut().ok_or_else(|| "Workspace is locked.".to_string())?;
    session.workspace = verify_peer_in_workspace(
        session.workspace.clone(),
        &args.peer_id,
        &args.fingerprint,
        &args.key_id,
    )
    .map_err(|error| error.to_string())?;
    persist_workspace_file(session).map_err(|error| error.to_string())?;
    Ok(session.workspace.clone())
}

#[tauri::command]
fn create_conversation(args: CreateConversationArgs) -> Result<Value, String> {
    let mut guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_mut().ok_or_else(|| "Workspace is locked.".to_string())?;
    session.workspace = create_conversation_in_workspace(
        session.workspace.clone(),
        &args.local_identity_id,
        &args.peer_id,
        args.title.as_deref(),
        args.tags.unwrap_or_default(),
        args.require_verified_peer.unwrap_or(false),
    )
    .map_err(|error| error.to_string())?;
    persist_workspace_file(session).map_err(|error| error.to_string())?;
    Ok(session.workspace.clone())
}

#[tauri::command]
fn list_conversations() -> Result<Value, String> {
    let guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_ref().ok_or_else(|| "Workspace is locked.".to_string())?;
    Ok(session
        .workspace
        .get("comms")
        .and_then(|comms| comms.get("conversations"))
        .cloned()
        .unwrap_or_else(|| json!([])))
}

#[tauri::command]
fn get_conversation_messages(args: ConversationIdArgs) -> Result<Value, String> {
    let guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_ref().ok_or_else(|| "Workspace is locked.".to_string())?;
    let messages = session
        .workspace
        .get("comms")
        .and_then(|comms| comms.get("messages"))
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter(|entry| entry.get("conversationId").and_then(Value::as_str) == Some(args.conversation_id.as_str()))
        .collect::<Vec<_>>();
    Ok(Value::Array(messages))
}

#[tauri::command]
fn save_draft(args: SaveDraftArgs) -> Result<Value, String> {
    let mut guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_mut().ok_or_else(|| "Workspace is locked.".to_string())?;
    session.workspace =
        save_comms_draft_in_workspace(session.workspace.clone(), &args.conversation_id, args.draft)
            .map_err(|error| error.to_string())?;
    persist_workspace_file(session).map_err(|error| error.to_string())?;
    Ok(session.workspace.clone())
}

#[tauri::command]
fn send_message(args: SendMessageArgs) -> Result<Value, String> {
    let mut guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_mut().ok_or_else(|| "Workspace is locked.".to_string())?;
    session.workspace = send_comms_message_in_workspace(
        session.workspace.clone(),
        &args.conversation_id,
        args.draft,
        args.delivery_mode.as_deref(),
    )
    .map_err(|error| error.to_string())?;
    persist_workspace_file(session).map_err(|error| error.to_string())?;
    Ok(session.workspace.clone())
}

#[tauri::command]
fn fetch_relay_messages(args: FetchRelayMessagesArgs) -> Result<Value, String> {
    let mut guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_mut().ok_or_else(|| "Workspace is locked.".to_string())?;
    session.workspace = fetch_relay_messages_in_workspace(session.workspace.clone(), args.route_scope.as_deref())
        .map_err(|error| error.to_string())?;
    persist_workspace_file(session).map_err(|error| error.to_string())?;
    Ok(session.workspace.clone())
}

#[tauri::command]
fn ack_message(args: DeleteMessageArgs) -> Result<Value, String> {
    let guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_ref().ok_or_else(|| "Workspace is locked.".to_string())?;
    let receipts = session
        .workspace
        .get("comms")
        .and_then(|comms| comms.get("receipts"))
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .filter(|entry| entry.get("messageId").and_then(Value::as_str) == Some(args.message_id.as_str()))
        .collect::<Vec<_>>();
    Ok(Value::Array(receipts))
}

#[tauri::command]
fn lock_comms_session() -> Result<(), String> {
    lock_workspace()
}

#[tauri::command]
fn panic_lock_comms() -> Result<(), String> {
    lock_workspace()
}

#[tauri::command]
fn attach_file_from_vault(args: AttachFileArgs) -> Result<Value, String> {
    let mut guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_mut().ok_or_else(|| "Workspace is locked.".to_string())?;
    session.workspace = attach_file_to_conversation_in_workspace(
        session.workspace.clone(),
        &args.conversation_id,
        &args.file_blob_id,
        &args.display_name,
        &args.media_type,
        args.byte_length,
        &args.integrity_hash,
    )
    .map_err(|error| error.to_string())?;
    persist_workspace_file(session).map_err(|error| error.to_string())?;
    Ok(session.workspace.clone())
}

#[tauri::command]
fn delete_message(args: DeleteMessageArgs) -> Result<Value, String> {
    let mut guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_mut().ok_or_else(|| "Workspace is locked.".to_string())?;
    let _ = args.delete_mode;
    session.workspace = delete_comms_message_in_workspace(session.workspace.clone(), &args.message_id)
        .map_err(|error| error.to_string())?;
    persist_workspace_file(session).map_err(|error| error.to_string())?;
    Ok(session.workspace.clone())
}

#[tauri::command]
fn delete_attachment_ref(args: DeleteAttachmentRefArgs) -> Result<Value, String> {
    let mut guard = SESSION.lock().map_err(|_| "Session lock poisoned".to_string())?;
    let session = guard.as_mut().ok_or_else(|| "Workspace is locked.".to_string())?;
    session.workspace = delete_attachment_ref_in_workspace(
        session.workspace.clone(),
        &args.attachment_id,
        args.delete_mode.as_deref().unwrap_or("standard-delete"),
    )
    .map_err(|error| error.to_string())?;
    persist_workspace_file(session).map_err(|error| error.to_string())?;
    Ok(session.workspace.clone())
}

#[tauri::command]
fn nuke_workspace() -> Result<(), String> {
    remove_workspace_file().map_err(|error| error.to_string())?;
    let mut guard = SESSION
        .lock()
        .map_err(|_| "Session lock poisoned".to_string())?;
    lock_session(&mut guard);
    Ok(())
}

#[tauri::command]
fn exit_app(app: tauri::AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}

#[tauri::command]
fn start_ollama_service() -> Result<Value, String> {
    if command_output("ollama", &["ps"]).is_ok() {
        return Ok(json!({
            "status": "running",
            "started": false
        }));
    }

    let child = Command::new("ollama")
        .arg("serve")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("Unable to start Ollama with `ollama serve`: {error}"))?;

    Ok(json!({
        "status": "starting",
        "started": true,
        "pid": child.id()
    }))
}

fn fit_main_window<R: tauri::Runtime>(app: &tauri::App<R>) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };

    let monitor = match window.current_monitor()? {
        Some(monitor) => Some(monitor),
        None => window.primary_monitor()?,
    };

    let Some(monitor) = monitor else {
        return Ok(());
    };

    let work_area = monitor.work_area();
    let logical_work_area: LogicalSize<f64> =
        LogicalSize::from_physical(work_area.size, monitor.scale_factor());
    let should_maximize = logical_work_area.width <= 1512.0 || logical_work_area.height <= 982.0;

    if should_maximize {
        window.maximize()?;
    } else {
        let width = (logical_work_area.width * 0.9).clamp(1480.0, 1728.0);
        let height = (logical_work_area.height * 0.9).clamp(920.0, 1117.0);

        window.set_size(LogicalSize::new(width, height))?;
        window.center()?;
    }

    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Err(error) = fit_main_window(app) {
                eprintln!("failed to fit main window: {error}");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_vault_state,
            get_license_state,
            install_license_key,
            remove_license,
            check_feature,
            initialize_workspace,
            unlock_workspace,
            lock_workspace,
            list_compartments,
            unlock_compartment,
            persist_workspace,
            store_record,
            delete_record,
            save_nostr_secret,
            load_nostr_secret,
            delete_nostr_secret,
            search_workspace,
            export_snapshot,
            import_snapshot,
            migrate_beta_workspace,
            create_comms_identity,
            rotate_comms_identity,
            export_identity_card,
            import_peer_card,
            verify_peer,
            create_conversation,
            list_conversations,
            get_conversation_messages,
            save_draft,
            send_message,
            fetch_relay_messages,
            ack_message,
            lock_comms_session,
            panic_lock_comms,
            attach_file_from_vault,
            delete_message,
            delete_attachment_ref,
            nuke_workspace,
            exit_app,
            start_ollama_service,
            store_file_blob_command,
            read_file_blob_command,
            delete_file_blob_command,
            purge_orphaned_file_blobs_command,
            list_file_blobs_command,
            list_accessibility_printers,
            speak_accessibility_prompt,
            get_lan_party_state,
            set_lan_party_enabled,
            scan_lan_peers,
            set_lan_presence,
            send_lan_chat,
            share_lan_note,
            upsert_lan_queue_item,
            send_lan_file,
            save_text_file_dialog,
            open_text_file_dialog,
            import_calibre_metadata_db
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
