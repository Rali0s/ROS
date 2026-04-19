#!/usr/bin/env bash

set -euo pipefail

APP_NAME="OSA Midnight Oil"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

info() {
  printf "\n[ROS] %s\n" "$1"
}

warn() {
  printf "\n[ROS][warn] %s\n" "$1"
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

install_homebrew() {
  info "Homebrew not found. Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -x /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
}

install_node_linux() {
  if has_cmd apt-get; then
    info "Installing Node.js and npm with apt..."
    sudo apt-get update
    sudo apt-get install -y nodejs npm build-essential curl
  elif has_cmd dnf; then
    info "Installing Node.js and npm with dnf..."
    sudo dnf install -y nodejs npm gcc-c++ make curl
  elif has_cmd pacman; then
    info "Installing Node.js and npm with pacman..."
    sudo pacman -Sy --noconfirm nodejs npm base-devel curl
  elif has_cmd zypper; then
    info "Installing Node.js and npm with zypper..."
    sudo zypper install -y nodejs npm gcc-c++ make curl
  else
    warn "Unsupported Linux package manager. Install Node.js 18+ and npm manually, then rerun."
    exit 1
  fi
}

install_rust() {
  if has_cmd rustup; then
    info "Rustup already installed."
  else
    info "Installing Rust toolchain..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  fi

  export PATH="$HOME/.cargo/bin:$PATH"

  if has_cmd cargo; then
    info "Installing wasm-pack (optional build helper)..."
    cargo install wasm-pack || warn "wasm-pack install skipped. The web build still works without it."
    info "Installing Tauri CLI for desktop mode..."
    cargo install tauri-cli || warn "tauri-cli install skipped. Web mode still works."
  else
    warn "Cargo was not found after rustup install. Skipping wasm-pack."
  fi
}

install_node_macos() {
  if ! has_cmd brew; then
    install_homebrew
  fi

  info "Installing Node.js with Homebrew..."
  brew install node
}

verify_node() {
  if ! has_cmd node || ! has_cmd npm; then
    warn "Node.js and npm are required but were not found."
    exit 1
  fi

  info "Node version: $(node --version)"
  info "npm version: $(npm --version)"
}

main() {
  info "Starting ${APP_NAME} installer"
  info "Repository: ${REPO_ROOT}"

  case "$(uname -s)" in
    Darwin)
      install_node_macos
      ;;
    Linux)
      install_node_linux
      ;;
    *)
      warn "This script supports macOS and Linux. Use install.bat on Windows."
      exit 1
      ;;
  esac

  verify_node
  install_rust

  cd "${REPO_ROOT}"

  info "Installing project dependencies..."
  npm install

  info "Running production build..."
  npm run build

  cat <<'EOF'

[ROS] Install complete.

Next steps:
  1. Start the app locally with: npm run dev
  2. Open the printed local URL in your browser
  3. Create or unlock your master-locked workspace

Notes:
  - wasm-pack is optional. If unavailable, the Vite build still completes.
  - This installer sets up a local development/build environment only.
EOF
}

main "$@"
