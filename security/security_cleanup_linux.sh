#!/bin/bash
# ROS Security Cleanup Script for Linux
# This script cleans up security-related files and keys

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECURITY_DIR="$SCRIPT_DIR"
CERT_DIR="$SECURITY_DIR/certs"
LOG_DIR="/var/log/ros"

echo "ROS Security Cleanup Script for Linux"
echo "====================================="

# Function to safely remove files
safe_remove() {
    local file="$1"
    if [[ -f "$file" ]]; then
        echo "Removing $file"
        shred -u "$file" 2>/dev/null || rm -f "$file"
    fi
}

# Function to safely remove directories
safe_remove_dir() {
    local dir="$1"
    if [[ -d "$dir" ]]; then
        echo "Removing directory $dir"
        find "$dir" -type f -exec shred -u {} \; 2>/dev/null || true
        rm -rf "$dir"
    fi
}

# Stop services
echo "Stopping ROS services..."
systemctl stop ros-enrollment 2>/dev/null || true
systemctl disable ros-enrollment 2>/dev/null || true

# Remove certificates
echo "Removing certificates..."
if [[ -d "$CERT_DIR" ]]; then
    for cert_file in "$CERT_DIR"/*.cert; do
        safe_remove "$cert_file"
    done
    for key_file in "$CERT_DIR"/*.key; do
        safe_remove "$key_file"
    done
fi

# Remove server certificates
safe_remove "$SECURITY_DIR/server.crt"
safe_remove "$SECURITY_DIR/server.key"

# Remove TPM data
echo "Cleaning TPM data..."
tpm2_clear 2>/dev/null || true
tpm2_evictcontrol -C o -c 0x81000000 2>/dev/null || true

# Remove SGX data
echo "Cleaning SGX data..."
# Note: SGX cleanup would require specific SGX tools

# Remove SEV data
echo "Cleaning SEV data..."
# Note: SEV cleanup would require specific SEV tools

# Remove log files
echo "Removing log files..."
if [[ -d "$LOG_DIR" ]]; then
    find "$LOG_DIR" -name "*.log" -exec safe_remove {} \;
fi

# Remove temporary files
echo "Removing temporary files..."
find /tmp -name "ros_*" -type f -exec safe_remove {} \; 2>/dev/null || true

# Remove systemd service file
echo "Removing systemd service..."
rm -f /etc/systemd/system/ros-enrollment.service
systemctl daemon-reload

# Remove user and group
echo "Removing ROS user and group..."
userdel ros 2>/dev/null || true
groupdel ros 2>/dev/null || true

# Remove installation directory
read -p "Remove entire ROS security directory ($SECURITY_DIR)? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    safe_remove_dir "$SECURITY_DIR"
fi

echo "Security cleanup completed successfully!"
echo "Please reboot the system to ensure all changes take effect."