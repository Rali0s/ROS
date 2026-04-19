use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::net::{Shutdown, TcpListener, TcpStream, UdpSocket};
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

const DISCOVERY_PORT: u16 = 45211;
const SESSION_PORT: u16 = 45212;
const FILES_PORT: u16 = 45213;

static LAN_STATE: Lazy<Mutex<LanPartyState>> = Lazy::new(|| Mutex::new(LanPartyState::default()));
static LAN_GENERATION: AtomicUsize = AtomicUsize::new(0);

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LanPeer {
    pub id: String,
    pub hostname: String,
    pub codename: String,
    pub operator: String,
    pub ip: String,
    pub status: String,
    pub role: String,
    pub last_seen_at: String,
    pub pinned: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LanMessage {
    pub id: String,
    pub sender_host: String,
    pub sender_ip: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LanSharedNote {
    pub id: String,
    pub note_id: String,
    pub title: String,
    pub excerpt: String,
    pub sender_host: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LanQueueItem {
    pub id: String,
    pub label: String,
    pub owner: String,
    pub state: String,
    pub note: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LanTransfer {
    pub id: String,
    pub direction: String,
    pub file_name: String,
    pub sender_host: String,
    pub target_host: String,
    pub bytes: usize,
    pub status: String,
    pub saved_path: String,
    pub detail: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanIdentity {
    pub hostname: String,
    pub codename: String,
    pub operator: String,
    pub local_ip: String,
    pub status: String,
    pub role: String,
}

impl Default for LanIdentity {
    fn default() -> Self {
        Self {
            hostname: current_hostname(),
            codename: "OSA Midnight Oil".to_string(),
            operator: "Guest Operator".to_string(),
            local_ip: local_ip(),
            status: "online".to_string(),
            role: "peer".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanPorts {
    pub discovery: u16,
    pub session: u16,
    pub files: u16,
}

impl Default for LanPorts {
    fn default() -> Self {
        Self {
            discovery: DISCOVERY_PORT,
            session: SESSION_PORT,
            files: FILES_PORT,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanSession {
    pub feed_mode: String,
    pub host_ip: String,
    pub host_name: String,
    pub joined_at: String,
    pub warnings: Vec<String>,
}

impl Default for LanSession {
    fn default() -> Self {
        Self {
            feed_mode: "lan-only".to_string(),
            host_ip: String::new(),
            host_name: String::new(),
            joined_at: String::new(),
            warnings: vec!["LAN chat is intentionally unencrypted for beta.".to_string()],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanSecurity {
    pub bind_scope: String,
    pub open_ports: Vec<String>,
    pub open_port_count: usize,
    pub warnings: Vec<String>,
}

impl Default for LanSecurity {
    fn default() -> Self {
        Self {
            bind_scope: "LAN only".to_string(),
            open_ports: Vec::new(),
            open_port_count: 0,
            warnings: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanDiagnostics {
    pub last_scan_at: String,
    pub last_sync_at: String,
}

impl Default for LanDiagnostics {
    fn default() -> Self {
        Self {
            last_scan_at: String::new(),
            last_sync_at: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanPartyState {
    pub enabled: bool,
    pub ports: LanPorts,
    pub identity: LanIdentity,
    pub peers: Vec<LanPeer>,
    pub remembered_peers: Vec<LanPeer>,
    pub chat: Vec<LanMessage>,
    pub shared_notes: Vec<LanSharedNote>,
    pub queue: Vec<LanQueueItem>,
    pub transfers: Vec<LanTransfer>,
    pub session: LanSession,
    pub security: LanSecurity,
    pub diagnostics: LanDiagnostics,
}

impl Default for LanPartyState {
    fn default() -> Self {
        Self {
            enabled: false,
            ports: LanPorts::default(),
            identity: LanIdentity::default(),
            peers: Vec::new(),
            remembered_peers: Vec::new(),
            chat: Vec::new(),
            shared_notes: Vec::new(),
            queue: Vec::new(),
            transfers: Vec::new(),
            session: LanSession::default(),
            security: LanSecurity::default(),
            diagnostics: LanDiagnostics::default(),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnableLanArgs {
    pub enabled: bool,
    pub codename: Option<String>,
    pub operator: Option<String>,
    pub default_status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanLanArgs {
    pub target_ip: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresenceArgs {
    pub status: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendChatArgs {
    pub content: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShareNoteArgs {
    pub note_id: String,
    pub title: String,
    pub excerpt: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertQueueArgs {
    pub item: LanQueueItem,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendFileArgs {
    pub name: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
enum DiscoveryPacket {
    Scan { requester: String },
    Presence { peer: LanPeerWire },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LanPeerWire {
    hostname: String,
    codename: String,
    operator: String,
    ip: String,
    status: String,
    role: String,
    last_seen_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
enum SessionPacket {
    Chat { message: LanMessage },
    Note { note: LanSharedNote },
    Queue { item: LanQueueItem },
    Hello { peer: LanPeerWire },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FilePacket {
    file_name: String,
    sender_host: String,
    sender_ip: String,
    created_at: String,
    content_base64: String,
}

fn make_id(prefix: &str) -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    format!("{prefix}-{millis:x}")
}

fn iso_now() -> String {
    format!("{:?}", SystemTime::now())
}

fn current_hostname() -> String {
    std::env::var("HOSTNAME")
        .or_else(|_| std::env::var("COMPUTERNAME"))
        .unwrap_or_else(|_| "ros-terminal".to_string())
}

fn local_ip() -> String {
    UdpSocket::bind("0.0.0.0:0")
        .and_then(|socket| {
            let _ = socket.connect("8.8.8.8:80");
            socket.local_addr()
        })
        .map(|address| address.ip().to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string())
}

fn save_directory() -> PathBuf {
    dirs::download_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
        .join("ROS-F-Society")
}

fn refresh_identity(codename: Option<String>, operator: Option<String>) {
    if let Ok(mut state) = LAN_STATE.lock() {
        if let Some(value) = codename.filter(|entry| !entry.trim().is_empty()) {
            state.identity.codename = value;
        }
        if let Some(value) = operator.filter(|entry| !entry.trim().is_empty()) {
            state.identity.operator = value;
        }
        state.identity.hostname = current_hostname();
        state.identity.local_ip = local_ip();
        state.diagnostics.last_sync_at = iso_now();
    }
}

fn build_local_peer() -> LanPeerWire {
    let state = LAN_STATE.lock().ok().map(|guard| guard.clone()).unwrap_or_default();
    LanPeerWire {
        hostname: state.identity.hostname,
        codename: state.identity.codename,
        operator: state.identity.operator,
        ip: state.identity.local_ip,
        status: state.identity.status,
        role: state.identity.role,
        last_seen_at: iso_now(),
    }
}

fn merge_peer(peer: LanPeerWire) {
    if let Ok(mut state) = LAN_STATE.lock() {
        if peer.ip == state.identity.local_ip && peer.hostname == state.identity.hostname {
            return;
        }

        let next = LanPeer {
            id: format!("peer-{}", peer.ip.replace('.', "-")),
            hostname: peer.hostname,
            codename: peer.codename,
            operator: peer.operator,
            ip: peer.ip,
            status: peer.status,
            role: peer.role,
            last_seen_at: peer.last_seen_at,
            pinned: false,
        };

        if let Some(existing) = state.peers.iter_mut().find(|entry| entry.ip == next.ip) {
            *existing = next;
        } else {
            state.peers.push(next);
            state.peers.sort_by(|left, right| left.codename.cmp(&right.codename));
        }
    }
}

fn open_ports(enabled: bool) {
    if let Ok(mut state) = LAN_STATE.lock() {
        if enabled {
            state.security.open_ports = vec![
                format!("discovery:{}", state.ports.discovery),
                format!("session:{}", state.ports.session),
                format!("files:{}", state.ports.files),
            ];
            state.security.open_port_count = 3;
            state.security.warnings = vec![
                "F*Society LAN mode intentionally opens local-only ports.".to_string(),
                "LAN chat is unencrypted for beta.".to_string(),
            ];
        } else {
            state.security.open_ports.clear();
            state.security.open_port_count = 0;
            state.security.warnings.clear();
            state.peers.clear();
            state.session.host_ip.clear();
            state.session.host_name.clear();
            state.session.joined_at.clear();
        }
    }
}

fn write_session_to_peer(ip: &str, packet: &SessionPacket) {
    if let Ok(mut stream) = TcpStream::connect((ip, SESSION_PORT)) {
        if let Ok(serialized) = serde_json::to_vec(packet) {
            let _ = stream.write_all(&serialized);
            let _ = stream.shutdown(Shutdown::Both);
        }
    }
}

fn broadcast_presence() {
    if let Ok(state) = LAN_STATE.lock() {
        if !state.enabled {
            return;
        }
    }

    let packet = DiscoveryPacket::Presence {
        peer: build_local_peer(),
    };

    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
        let _ = socket.set_broadcast(true);
        if let Ok(serialized) = serde_json::to_vec(&packet) {
            let _ = socket.send_to(&serialized, ("255.255.255.255", DISCOVERY_PORT));
        }
    }
}

fn peers_snapshot() -> Vec<LanPeer> {
    LAN_STATE
        .lock()
        .ok()
        .map(|state| state.peers.clone())
        .unwrap_or_default()
    }

fn send_file_to_peer(ip: &str, packet: &FilePacket) {
    if let Ok(mut stream) = TcpStream::connect((ip, FILES_PORT)) {
        if let Ok(serialized) = serde_json::to_vec(packet) {
            let _ = stream.write_all(&serialized);
            let _ = stream.shutdown(Shutdown::Both);
        }
    }
}

fn run_discovery_listener(generation: usize) {
    let Ok(socket) = UdpSocket::bind(("0.0.0.0", DISCOVERY_PORT)) else {
        return;
    };
    let _ = socket.set_broadcast(true);
    let _ = socket.set_read_timeout(Some(Duration::from_millis(500)));
    let mut buffer = [0u8; 8192];
    let mut last_presence = Instant::now() - Duration::from_secs(5);

    while LAN_GENERATION.load(Ordering::SeqCst) == generation {
        if last_presence.elapsed() >= Duration::from_secs(4) {
            broadcast_presence();
            last_presence = Instant::now();
        }

        match socket.recv_from(&mut buffer) {
            Ok((size, address)) => {
                if let Ok(packet) = serde_json::from_slice::<DiscoveryPacket>(&buffer[..size]) {
                    match packet {
                        DiscoveryPacket::Scan { .. } => {
                            let response = DiscoveryPacket::Presence {
                                peer: build_local_peer(),
                            };
                            if let Ok(serialized) = serde_json::to_vec(&response) {
                                let _ = socket.send_to(&serialized, address);
                            }
                        }
                        DiscoveryPacket::Presence { mut peer } => {
                            if peer.ip.trim().is_empty() {
                                peer.ip = address.ip().to_string();
                            }
                            merge_peer(peer);
                        }
                    }
                }
            }
            Err(_) => {}
        }
    }
}

fn handle_session_stream(mut stream: TcpStream) {
    let mut buffer = Vec::new();
    if stream.read_to_end(&mut buffer).is_err() {
        return;
    }

    let Ok(packet) = serde_json::from_slice::<SessionPacket>(&buffer) else {
        return;
    };

    if let Ok(mut state) = LAN_STATE.lock() {
        match packet {
            SessionPacket::Chat { message } => {
                state.chat.insert(0, message);
                state.chat.truncate(80);
            }
            SessionPacket::Note { note } => {
                state.shared_notes.insert(0, note);
                state.shared_notes.truncate(48);
            }
            SessionPacket::Queue { item } => {
                if let Some(existing) = state.queue.iter_mut().find(|entry| entry.id == item.id) {
                    *existing = item;
                } else {
                    state.queue.insert(0, item);
                }
                state.queue.truncate(48);
            }
            SessionPacket::Hello { peer } => {
                drop(state);
                merge_peer(peer);
                return;
            }
        }
    }
}

fn run_session_listener(generation: usize) {
    let Ok(listener) = TcpListener::bind(("0.0.0.0", SESSION_PORT)) else {
        return;
    };
    let _ = listener.set_nonblocking(true);

    while LAN_GENERATION.load(Ordering::SeqCst) == generation {
        match listener.accept() {
            Ok((stream, _)) => handle_session_stream(stream),
            Err(_) => thread::sleep(Duration::from_millis(220)),
        }
    }
}

fn handle_file_stream(mut stream: TcpStream) {
    let mut buffer = Vec::new();
    if stream.read_to_end(&mut buffer).is_err() {
        return;
    }

    let Ok(packet) = serde_json::from_slice::<FilePacket>(&buffer) else {
        return;
    };
    let Ok(bytes) = BASE64.decode(packet.content_base64.as_bytes()) else {
        return;
    };

    let target_dir = save_directory();
    let _ = fs::create_dir_all(&target_dir);
    let path = target_dir.join(&packet.file_name);
    let saved_path = if fs::write(&path, &bytes).is_ok() {
        path.to_string_lossy().to_string()
    } else {
        String::new()
    };
    let transfer_status = if saved_path.is_empty() {
        "error".to_string()
    } else {
        "received".to_string()
    };
    let transfer_detail = if saved_path.is_empty() {
        "Unable to save incoming file.".to_string()
    } else {
        "Received from LAN peer.".to_string()
    };

    if let Ok(mut state) = LAN_STATE.lock() {
        let target_host = state.identity.hostname.clone();
        state.transfers.insert(
            0,
            LanTransfer {
                id: make_id("transfer"),
                direction: "incoming".to_string(),
                file_name: packet.file_name,
                sender_host: packet.sender_host,
                target_host,
                bytes: bytes.len(),
                status: transfer_status,
                saved_path,
                detail: transfer_detail,
                created_at: packet.created_at,
            },
        );
        state.transfers.truncate(32);
    }
}

fn run_file_listener(generation: usize) {
    let Ok(listener) = TcpListener::bind(("0.0.0.0", FILES_PORT)) else {
        return;
    };
    let _ = listener.set_nonblocking(true);

    while LAN_GENERATION.load(Ordering::SeqCst) == generation {
        match listener.accept() {
            Ok((stream, _)) => handle_file_stream(stream),
            Err(_) => thread::sleep(Duration::from_millis(240)),
        }
    }
}

pub fn get_state(codename: Option<String>, operator: Option<String>) -> LanPartyState {
    refresh_identity(codename, operator);
    LAN_STATE.lock().ok().map(|guard| guard.clone()).unwrap_or_default()
}

pub fn set_enabled(args: EnableLanArgs) -> LanPartyState {
    refresh_identity(args.codename, args.operator);
    if let Ok(mut state) = LAN_STATE.lock() {
        state.enabled = args.enabled;
        if let Some(value) = args.default_status {
            state.identity.status = value;
        }
        state.session.joined_at = if args.enabled { iso_now() } else { String::new() };
    }

    open_ports(args.enabled);
    let generation = LAN_GENERATION.fetch_add(1, Ordering::SeqCst) + 1;

    if args.enabled {
        thread::spawn(move || run_discovery_listener(generation));
        thread::spawn(move || run_session_listener(generation));
        thread::spawn(move || run_file_listener(generation));
        broadcast_presence();
    }

    get_state(None, None)
}

pub fn scan(args: ScanLanArgs) -> LanPartyState {
    if let Ok(mut state) = LAN_STATE.lock() {
        state.diagnostics.last_scan_at = iso_now();
    }

    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
        let request = DiscoveryPacket::Scan {
            requester: build_local_peer().hostname,
        };
        if let Ok(serialized) = serde_json::to_vec(&request) {
            let _ = socket.set_broadcast(true);
            let _ = socket.send_to(&serialized, ("255.255.255.255", DISCOVERY_PORT));
            if let Some(ip) = args.target_ip.filter(|entry| !entry.trim().is_empty()) {
                let _ = socket.send_to(&serialized, (ip.as_str(), DISCOVERY_PORT));
                write_session_to_peer(&ip, &SessionPacket::Hello { peer: build_local_peer() });
            }
        }
    }

    get_state(None, None)
}

pub fn set_presence(args: PresenceArgs) -> LanPartyState {
    if let Ok(mut state) = LAN_STATE.lock() {
        if let Some(value) = args.status {
            state.identity.status = value;
        }
        if let Some(value) = args.role {
            state.identity.role = value;
        }
    }
    broadcast_presence();
    get_state(None, None)
}

pub fn send_chat(args: SendChatArgs) -> LanPartyState {
    let local = build_local_peer();
    let message = LanMessage {
        id: make_id("chat"),
        sender_host: local.codename.clone(),
        sender_ip: local.ip.clone(),
        content: args.content,
        created_at: iso_now(),
    };

    if let Ok(mut state) = LAN_STATE.lock() {
        state.chat.insert(0, message.clone());
        state.chat.truncate(80);
    }

    let packet = SessionPacket::Chat { message };
    for peer in peers_snapshot() {
        write_session_to_peer(&peer.ip, &packet);
    }

    get_state(None, None)
}

pub fn share_note(args: ShareNoteArgs) -> LanPartyState {
    let local = build_local_peer();
    let note = LanSharedNote {
        id: make_id("note"),
        note_id: args.note_id,
        title: args.title,
        excerpt: args.excerpt,
        sender_host: local.codename.clone(),
        created_at: iso_now(),
    };

    if let Ok(mut state) = LAN_STATE.lock() {
        state.shared_notes.insert(0, note.clone());
        state.shared_notes.truncate(48);
    }

    let packet = SessionPacket::Note { note };
    for peer in peers_snapshot() {
        write_session_to_peer(&peer.ip, &packet);
    }

    get_state(None, None)
}

pub fn upsert_queue(args: UpsertQueueArgs) -> LanPartyState {
    let item = LanQueueItem {
        updated_at: iso_now(),
        ..args.item
    };

    if let Ok(mut state) = LAN_STATE.lock() {
        if let Some(existing) = state.queue.iter_mut().find(|entry| entry.id == item.id) {
            *existing = item.clone();
        } else {
            state.queue.insert(0, item.clone());
        }
        state.queue.truncate(48);
    }

    let packet = SessionPacket::Queue { item };
    for peer in peers_snapshot() {
        write_session_to_peer(&peer.ip, &packet);
    }

    get_state(None, None)
}

pub fn send_file(args: SendFileArgs) -> LanPartyState {
    let local = build_local_peer();
    let file_packet = FilePacket {
        file_name: args.name.clone(),
        sender_host: local.codename.clone(),
        sender_ip: local.ip.clone(),
        created_at: iso_now(),
        content_base64: BASE64.encode(args.content.as_bytes()),
    };

    let peers = peers_snapshot();
    if let Ok(mut state) = LAN_STATE.lock() {
        state.transfers.insert(
            0,
            LanTransfer {
                id: make_id("transfer"),
                direction: "outgoing".to_string(),
                file_name: args.name,
                sender_host: local.codename,
                target_host: peers
                    .first()
                    .map(|entry| entry.codename.clone())
                    .unwrap_or_else(|| "LAN peers".to_string()),
                bytes: args.content.len(),
                status: if peers.is_empty() {
                    "queued".to_string()
                } else {
                    "sent".to_string()
                },
                saved_path: String::new(),
                detail: if peers.is_empty() {
                    "No active peers detected yet.".to_string()
                } else {
                    "Sent to active LAN peers.".to_string()
                },
                created_at: iso_now(),
            },
        );
        state.transfers.truncate(32);
    }

    for peer in peers {
        send_file_to_peer(&peer.ip, &file_packet);
    }

    get_state(None, None)
}
