# INSTALL

This guide covers the quickest setup paths for **OSA Midnight Oil / ROS** on macOS, Windows, and Linux, with special attention to building the native desktop app through Tauri.

## Repo Setup

Clone the repository and install frontend dependencies:

```bash
git clone <your-repo-url>
cd ROS
npm install
```

## Web App

For the browser/Vite development path:

```bash
npm run dev
```

For a production web build:

```bash
npm run build
```

Note: the optional WASM step may be skipped if `wasm-pack` or the `wasm32-unknown-unknown` target is not installed.

## Native Desktop

The native desktop app is built through Tauri:

```bash
npm run desktop:dev
npm run desktop:build
```

These commands build for the **current machine’s operating system**:

- macOS host -> `.dmg`
- Windows host -> `.exe` installer
- Linux host -> `.AppImage` / distro package

## Windows Build Environment

If you want the Windows installer on a Windows laptop, prepare that machine first.

### 1. Install prerequisites

Install these on Windows:

- Node.js 20
- Rust
- Microsoft Visual Studio Build Tools with C++ support
- WebView2 Runtime

Recommended:

- Git
- PowerShell

### 2. Install Tauri CLI

Open PowerShell and run:

```powershell
cargo install tauri-cli
```

### 3. Clone and install

```powershell
git clone <your-repo-url>
cd ROS
npm install
```

### 4. Run the desktop build

```powershell
npm run desktop:build
```

### 5. Find the installer

The Windows installer should be written under:

```powershell
src-tauri\target\release\bundle\nsis\
```

Look for the generated `.exe` installer there.

## macOS Build Environment

On macOS:

- install Node.js 20
- install Rust
- install Tauri CLI

Then run:

```bash
npm install
npm run desktop:build
```

The macOS bundle will be written under:

```bash
src-tauri/target/release/bundle/dmg/
```

## Linux Build Environment

On Linux:

- install Node.js 20
- install Rust
- install Tauri CLI
- install required WebKitGTK / GTK packaging dependencies for Tauri

Then run:

```bash
npm install
npm run desktop:build
```

Expected Linux artifacts are typically written under:

```bash
src-tauri/target/release/bundle/appimage/
src-tauri/target/release/bundle/deb/
```

## Disk Space Notes

Rust/Tauri builds can consume several gigabytes in:

- `src-tauri/target/`
- `rust-core/target/`

If builds fail with `No space left on device`, clear the build artifacts:

```bash
rm -rf src-tauri/target rust-core/target
```

On Windows, remove the equivalent target folders manually or through PowerShell.

## Release-Oriented Commands

Build the native app:

```bash
npm run desktop:build
```

Generate release checksums:

```bash
npm run release:checksums
```

Serve the beta site locally:

```bash
npm run site:beta:serve
```

## GitHub Actions Note

If you want cross-platform artifacts without building on each platform manually, use the workflow in:

[/Users/premise/Documents/github/ROS/.github/workflows/beta-artifacts.yml](/Users/premise/Documents/github/ROS/.github/workflows/beta-artifacts.yml)

But for a **local Windows installer**, you must build on a Windows host.
