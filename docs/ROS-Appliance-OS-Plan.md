# ROS Appliance OS Plan

## Summary

Build **ROS Appliance OS** as a local-first operator appliance image, not a from-scratch Linux distribution. The first release should ship a known-good Linux base with ROS, OmniX, local model runtime support, encrypted workspace behavior, and a fullscreen cockpit GUI.

The product should feel like a custom OS, but avoid early kernel/EFI maintenance. For v0.1, use the vendor-supported boot chain, kernel, device trees, and drivers.

## Product Shape

- Name the hardware/software image **ROS Appliance OS** or **OSA-Midnight Oil Node**.
- First supported board: **Raspberry Pi 5, 64-bit**.
- Second board after v0.1: **Orange Pi 5 / 5 Plus using Armbian**.
- Boot flow:
  - power on
  - Linux boots
  - ROS kiosk session starts
  - unlock screen appears
  - encrypted workspace decrypts for the session
  - Operator Memory Cockpit opens
- Do **not** build a custom kernel distribution in v0.1.
- Do **not** rely on generic PC EFI assumptions for Raspberry Pi / Orange Pi.

## Architecture

### Base OS

- Raspberry Pi v0.1 base: **Raspberry Pi OS Lite 64-bit / Debian Bookworm**.
- Orange Pi later base: **Armbian Bookworm**.
- Keep vendor-provided:
  - firmware
  - bootloader
  - kernel image
  - kernel modules
  - device tree blobs
  - GPU/display support
- Add ROS through provisioning scripts instead of rebuilding the whole OS.

### GUI Session

- Use **Wayland kiosk** by default:
  - `cage` or `weston`
  - fullscreen ROS Tauri shell
- Keep **Xorg/XServer** as compatibility fallback only.
- ROS launches as a dedicated `ros` user session.
- Disable unnecessary desktop environment services.

### ROS Runtime

- Install ROS app under `/opt/ros`.
- Run the existing Tauri 2 desktop app as the primary GUI.
- Keep encrypted workspace behavior unchanged.
- Store ROS user data under the `ros` user home or a mounted ROS data path.
- Add systemd units:
  - `ros-kiosk.service`
  - `ros-model-runtime.service`
  - `ros-omnix.service` if OmniX daemon/service mode is added
  - `ros-health.service` for local readiness checks

### OmniX Integration

- Build OmniX from `../OmniX-Core` during image creation.
- Install binary to `/opt/omnix/bin/omnix`.
- Add shims:
  - `/usr/local/bin/omnix`
  - `/usr/local/bin/tze`
- Expose OmniX inside ROS as:
  - deterministic analyst runtime
  - guarded local shell backend
  - project evidence analyzer
  - command-memory source
- Keep OmniX execution deterministic-first; model assist is optional.

### Rust ROS Terminal

- Add a Rust terminal service after the appliance base works.
- Use a PTY-backed design:
  - Rust service owns shell sessions
  - ROS UI renders terminal stream
  - commands and output excerpts can be saved into project memory
- Suggested crates:
  - `tokio`
  - `portable-pty`
  - `serde`
  - Tauri commands/events
- Terminal scope:
  - command execution
  - output capture
  - project linking
  - memory save
  - no autonomous command execution by models

## Image Build Plan

### Phase 1: Appliance Prototype

- Create `appliance/raspi/` provisioning scripts.
- Start from Raspberry Pi OS Lite 64-bit.
- Install:
  - Node build prerequisites
  - Rust toolchain
  - Tauri Linux dependencies
  - Wayland kiosk runtime
  - Ollama or local model runtime hook
  - OmniX binary
- Build ROS desktop artifact.
- Configure auto-login into kiosk session.
- Launch ROS fullscreen.
- Confirm unlock/cockpit works on boot.

### Phase 2: ROS Node Services

- Add local service health checks:
  - ROS GUI ready
  - encrypted workspace locked/unlocked state
  - OmniX available
  - model runtime available
  - disk space
  - network state
- Surface these in the cockpit Intelligence Rail.
- Add local-only setup page for:
  - hostname
  - Wi-Fi/LAN
  - model preparation
  - backup/export path

### Phase 3: Hardware Product Readiness

- Add first-boot setup:
  - create operator name
  - set master passphrase
  - choose local model profile
  - prepare OmniX
- Add backup/export workflow to USB storage.
- Add signed release checksums.
- Add image version metadata.
- Add recovery documentation.

## Public Interfaces

- Add appliance metadata exposed to ROS:
  - `deviceKind`
  - `boardModel`
  - `imageVersion`
  - `kernelVersion`
  - `omnixStatus`
  - `modelRuntimeStatus`
  - `displayRuntime`
- Add Tauri commands or local service endpoints for:
  - check appliance health
  - check OmniX availability
  - run guarded OmniX command
  - open PTY session
  - save terminal capture into memory
- Do not expose raw kernel/boot controls in the regular UI.

## Test Plan

- Build ROS desktop app on ARM64 Linux.
- Boot Raspberry Pi 5 image from fresh SD/NVMe.
- Verify:
  - kiosk launches ROS automatically
  - unlock screen appears before workspace content
  - encrypted workspace persists after reboot
  - cockpit opens after unlock
  - OmniX command `omnix --help` works
  - `tze` shim works
  - local model runtime unavailable state is friendly
  - model runtime ready state appears when installed
  - terminal captures save into project memory
  - USB backup/export works
- Run smoke checks:
  - `npm run build`
  - `npm run desktop:build` on ARM64 target
  - OmniX `cmake --build build`
  - OmniX `ctest --test-dir build --output-on-failure`

## Assumptions

- v0.1 is an appliance image, not a custom Linux distro.
- Raspberry Pi 5 is the first hardware target.
- Orange Pi support comes after Raspberry Pi image flow is proven.
- Wayland kiosk is preferred; Xorg is fallback only.
- Kernel binaries, EFI files, custom boot shells, and Linux-from-scratch work are post-v0.1.
- OmniX is installed as a local runtime under ROS, not merged into the ROS GUI process.
- ROS remains the product surface; models and OmniX are intelligence/runtime layers underneath.
