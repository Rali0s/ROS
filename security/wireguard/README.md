# WireGuard Setup Guide with SGX Verification

This guide provides step-by-step instructions for setting up WireGuard VPN with SGX-based enrollment verification.

## 1. Install WireGuard on Ubuntu 22.04 and generate the server key pair

```bash
sudo apt update
sudo apt install wireguard-tools
sudo mkdir -p /etc/wireguard
cd /etc/wireguard
wg genkey | tee server_private.key | wg pubkey > server_public.key
```

## 2. Create `/etc/wireguard/wg0.conf` with the server interface

```bash
sudo tee /etc/wireguard/wg0.conf > /dev/null <<EOF
[Interface]
PrivateKey = $(cat /etc/wireguard/server_private.key)
Address = 10.0.0.1/24
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE; sysctl -w net.ipv4.ip_forward=1
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE; sysctl -w net.ipv4.ip_forward=0
EOF
sudo chmod 600 /etc/wireguard/wg0.conf
sudo wg-quick up wg0
```

## 3. Enrollment Daemon

The daemon script (`wg_daemon.sh`) handles automatic peer enrollment with SGX verification.

Key components:
- Pulls JSON from `https://os.example.com/enroll`
- Verifies SGX signature using Intel Attestation Service
- Appends verified peers to WireGuard config
- Reloads WireGuard configuration

To run the daemon:
```bash
chmod +x wg_daemon.sh
sudo ./wg_daemon.sh &
```

## 4. Key Rotation (Every 30 Days)

To rotate keys:
- Regenerate enclave key via the unified_enclave API
- Push new peer configuration to enrollment server
- Remove old peer from wg0.conf
- Reload WireGuard

Schedule with cron:
```bash
crontab -e
# Add: 0 0 */30 * * /path/to/key_rotation.sh
```

Run the rotation script:
```bash
chmod +x key_rotation.sh
sudo ./key_rotation.sh
```

## Prerequisites

- Ubuntu 22.04
- Intel SGX capable hardware
- jq for JSON parsing
- openssl for signature verification
- Access to enrollment server at https://os.example.com/enroll