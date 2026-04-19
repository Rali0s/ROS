# ROS Beta v0.1

ROS Beta v0.1 is the first public local-first desktop release of **OSA Midnight Oil**.

This beta focuses on a cinematic native workspace, encrypted local storage, recovery tooling, structured operator workflows, and a growing set of sidecar tools for research, identity management, and room-scale collaboration.

## Highlights

### Local-first secure workspace

- Master-lock workflow with encrypted persistence
- Native desktop vault path through Tauri/Rust
- Manual lock, auto-lock, reset, and full nuke controls
- Encrypted snapshot export/import for recovery and migration
- Dry-run backup validation in Control Room

### Core workspace apps

- `Overview`
- `Vault Notes`
- `Library`
- `Research Vault`
- `Profile Organizer`
- `Wallet Vault`
- `Flow Studio`
- `Bookmarks`
- `Inventory`
- `World Clocks`
- `Midnight Console`
- `Control Room`

### Nostr Lounge beta

- Read-first Nostr sidecar inside ROS
- Local profile draft persistence
- Keypair generation/import
- Relay controls and feed diagnostics
- Wallet Vault mirroring for Nostr identity records

### F*Society LAN beta

- In Testing Locally Still: QA
- Native-only LAN room for ROS terminals on the same local network
- Local subnet discovery and direct IPv4 probe fallback
- Active terminal roster with ROS host names and status
- Unencrypted LAN chat for same-site beta use
- Note handoff and lightweight shared callback queue
- ROS-managed direct file transfer
- `SECURITY::Open Ports` surfaced in shell, Overview, and Control Room

### Beta trust and continuity work

- First-run onboarding and operator readiness surfaces
- Support bundle export
- Release and entitlement status surfaces
- File-vault health reporting and orphan cleanup flow
- Better shell-level trust visibility across the app

## Platform Artifacts

This beta release is packaged for:

- macOS: `.dmg`
- Windows: installer package
- Linux: `AppImage` and distro package where available

Checksums are included with the release artifacts.

## Known Beta Limitations

- This is still a beta. Expect rough edges and active iteration.
- Browser mode remains the compatibility/runtime fallback; native desktop is the primary trust path.
- The optional WASM step may be skipped in some local builds if the `wasm32-unknown-unknown` target is not installed.
- Nostr Lounge is intentionally lightweight in this release and does not aim to be a full media-first client.
- F*Society LAN mode is native desktop only and intentionally labels LAN chat as unencrypted for beta.
- Large frontend bundles still trigger the current Vite chunk-size warning during production builds.

## Upgrade / First-Run Notes

- New users can initialize a fresh secure workspace on first launch.
- Existing beta/browser users can migrate into the native vault path.
- Operators should export an encrypted recovery bundle before trusting ROS with daily workflow data.

## Feedback

If you hit friction, layout issues, migration problems, backup concerns, or LAN/Nostr edge cases:

- save a local feedback draft in `Control Room`
- export a support bundle
- attach the support bundle when reporting the issue upstream

## Thank You

ROS Beta v0.1 is the first release that starts to feel like the intended product: a local-first operator workspace with strong atmosphere, practical trust surfaces, and room to expand into deeper desktop workflows without turning into a cloud-first system.

@Rali0s
