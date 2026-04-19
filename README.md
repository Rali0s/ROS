# OSA Midnight Oil

OSA Midnight Oil is a local-first desktop workspace built around a master-locked encrypted vault. It combines planning, note-taking, reference capture, identity organization, wallet storage, research tooling, and a cinematic ROS-style shell into one self-contained environment.

The project is designed to feel like a personal operations desk rather than a cloud app. Workspace data stays local, can be locked behind a passphrase, and is intended to remain useful offline.

## What It Includes

- `Overview`: high-level workspace status, counts, trust summary, and quick capture
- `Vault Notes`: markdown-first notes with structured templates and preview
- `Library`: local document catalog and reader workflow
- `Research Vault`: structured research intelligence records and study comparison
- `Profile Organizer`: identities, VoIP lines, phone book, PGP bundles, and operator records
- `ROS Comms`: local/native secure messaging workflow
- `Nostr Lounge`: lightweight read-first social sidecar
- `F*Society`: native-only LAN room for discovery, chat, handoff notes, and direct file sends
- `Flow Studio`: wireframe flow and system mapping
- `Wallet Vault`: wallet records and sensitive material inside the locked workspace
- `Control Room`: backup, recovery, trust posture, export/import, and destructive controls
- `Midnight Console`: local read-only console into the workspace state

## Security Model

- Workspace data is intended to be encrypted at rest.
- Decrypted workspace state only lives in memory during an unlocked session.
- The shell supports manual lock, idle auto-lock, backup export/import, and nuke/reset flows.
- Native desktop builds move more trust boundaries into Rust/Tauri instead of browser-managed storage.
- Local-first behavior is the default. Cloud sync is not required for core use.

## Runtime Modes

### Web / Beta Compatibility

The Vite app can run in the browser for rapid UI development and beta compatibility.

```bash
npm install
npm run dev
```

### Native Desktop

The primary desktop path lives under [src-tauri](/Users/premise/Documents/github/ROS/src-tauri) and uses Tauri 2.

```bash
npm run desktop:dev
```

To build desktop artifacts:

```bash
npm run desktop:build
```

If `cargo tauri` is not installed yet:

```bash
cargo install tauri-cli
```

## Standard Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

Additional project utilities:

- `npm run release:checksums`
- `npm run site:beta:serve`

## Build Notes

- `npm run build` attempts the optional WASM step first. If the `wasm32-unknown-unknown` target or `wasm-pack` is not available, that step is skipped and the Vite build still completes.
- Tauri/Rust build artifacts can consume several gigabytes. If local disk is tight, clearing `src-tauri/target` and `rust-core/target` is the fastest safe cleanup.

## Screenshots

### Secure Workspace Setup

![OSA Midnight Oil login and secure workspace setup](HD/OSA-Login.png)

### Dashboard Shell

![OSA Midnight Oil dashboard with overview, search, moon phase, and spiritual clock widgets](HD/OSA-Dashboard.png)

## Upstream Hygiene

For GitHub upstream, generated artifacts and local machine clutter should stay untracked:

- `dist/`
- `src-tauri/target/`
- `rust-core/target/`
- `.DS_Store`
- local `.env*` files

The repository should primarily contain source, assets that are intentionally part of the product, release metadata, and documentation.

## Project Direction

OSA Midnight Oil is evolving toward a native local-first desktop workspace with:

- stronger Rust-owned trust boundaries
- beta release packaging for macOS, Windows, and Linux
- support/recovery tooling
- structured research and operator workflows
- optional sidecar features like Nostr Lounge and F*Society without turning the core product into a cloud-first platform
