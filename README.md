# OSA Midnight Oil

OSA Midnight Oil is a local-first, encrypted operations workspace built for disciplined note-taking, planning, reference management, and personal command-center workflows. The project packages a desktop-style interface inside a web app and keeps the core experience focused on privacy, offline use, and operator-controlled organization rather than cloud sync or AI-driven automation.

The system is designed to feel like a self-contained console environment. It combines structured tools such as notes, bookmarks, inventory tracking, calendars, world clocks, profile organization, and flow mapping into a single shell. Workspace data is protected behind a master-lock model so the persisted workspace stays encrypted at rest and only decrypts into memory during an unlocked session.

## About

OSA Midnight Oil is meant to serve as a personal vault and planning desk. Instead of scattering context across multiple browser tabs, text editors, and ad hoc notes, the app brings that work into one environment with a consistent visual shell and a shared encrypted workspace model.

The project currently includes:

- `Overview`: a high-level dashboard showing current workspace activity and counts.
- `Calendar`: a practical month-view planner for scheduling events, deadlines, and checkpoints.
- `Vault Notes`: markdown-first notes with live capture and quick planning structure.
- `Profile Organizer`: encrypted identity and account organization for names, emails, social logins, PGP notes, VPN zones, and related records.
- `Flow Studio`: wireframe diagramming for system flows, workflows, and network-style maps.
- `Bookmarks`: saved references, docs, links, and recurring tools.
- `Inventory`: software, operating system, methodology, and asset tracking.
- `Wallet Vault`: storage for wallet labels, addresses, and sensitive recovery material inside the master-locked workspace.
- `World Clocks`: multiple time zones in one place.
- `Midnight Console`: a local command console for quick read access into the workspace.
- `Control Room`: workspace controls for import/export, reset, wallpaper changes, and lock-state management.

## Screenshots

### Secure Workspace Setup

![OSA Midnight Oil login and secure workspace setup](HD/OSA-Login.png)

### Dashboard Shell

![OSA Midnight Oil dashboard with overview, search, moon phase, and spiritual clock widgets](HD/OSA-Dashboard.png)

## ROS Terminal

ROS Terminal in this project is the desktop shell and console experience, not a remote-access tool and not an offensive security utility. It is best understood as the operating frame around the workspace.

Inside the app, the terminal surface appears as `Midnight Console`. It behaves like a local command pane that reads from the current unlocked workspace and returns lightweight text responses. It does not call external AI services, does not open network sessions, and does not execute arbitrary system commands from the desktop shell. Its purpose is fast retrieval and navigation, not shell escalation.

The current console supports commands such as:

- `help`
- `whoami`
- `date`
- `stats`
- `notes`
- `recent`
- `calendar`
- `bookmarks`
- `inventory`
- `profiles`
- `flows`
- `wallets`
- `clocks`
- `apps`
- `find <text>`

That makes ROS Terminal useful for quickly checking what is already in the workspace without opening every app window by hand. For example, you can list recent notes, inspect saved calendar events, summarize inventory, or search across the unlocked workspace from one place.

## Security Model

- The workspace uses a master passphrase and encrypted persistence.
- Data is encrypted at rest and only decrypted into memory for the active session.
- The shell supports manual lock and idle auto-lock.
- Snapshot export/import is supported for workspace portability.
- The project is intentionally local-first and does not depend on cloud sync.

## Branding

The project theme centers on `OSA Midnight Oil`, combining a dark console shell, a cinematic boot splash, and an oil-can brand mark used for the app logo and favicon. The visual language is meant to suggest a late-night command desk: deliberate, high-contrast, and atmospheric rather than minimal or office-generic.

## Development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Lint the codebase:

```bash
npm run lint
```

Easy install helpers are also included:

- `./install.sh` for macOS and Linux
- `install.bat` for Windows

These scripts install Node.js when needed, attempt to install the optional Rust/`wasm-pack` toolchain, install project dependencies, and run a production build so the workspace is ready for local use.

## Notes

- The optional Rust/WASM build step is attempted during production builds. If `wasm-pack` is not installed, that step is skipped and the web build still completes.
- This repository currently focuses on a self-contained desktop-like experience in the browser, with the shell, branding, and encrypted workspace all living in the same app.
