# Tailscale Setup Guide

## Overview

Tailscale provides secure, encrypted VPN access to your VaultKeeper server without exposing ports to the public internet.

## Step 1: Install Tailscale on Raspberry Pi

```bash
# Install
curl -fsSL https://tailscale.com/install.sh | sh

# Start and enable
sudo systemctl enable --now tailscaled

# Authenticate with your Tailscale account
sudo tailscale up
```

## Step 2: Configure Tailscale on Raspberry Pi

```bash
# Enable subnet routing (if Pi acts as exit node)
sudo tailscale up --advertise-routes=192.168.1.0/24

# Enable key expiry prevention
sudo tailscale up --auth-key=<your-auth-key>
```

### Generate Auth Key (Tailscale Admin Console)
1. Go to https://login.tailscale.com/admin/settings/keys
2. Click "Generate auth key"
3. Set expiration and reuse settings
4. Copy the key

## Step 3: Install Tailscale on Client Devices

### Desktop (Windows/macOS/Linux)
1. Download from https://tailscale.com/download
2. Install and authenticate
3. Verify connection: `tailscale status`

### Mobile (iOS/Android)
1. Install Tailscale from App Store / Play Store
2. Authenticate with same account
3. Enable in app settings

## Step 4: Verify Connectivity

```bash
# On Raspberry Pi
tailscale status

# Expected output
# 100.x.x.x   vaultkeeper       pi@    linux   -
# 100.x.x.x   desktop          user@  windows active
# 100.x.x.x   mobile           user@  ios     active
```

### Test VaultKeeper Access
```bash
# From any Tailscale-connected device
curl http://<tailscale-ip-of-pi>:3456/health
```

## Step 5: Configure VaultKeeper Client

In the desktop/mobile app settings:
```
Sync Server URL: http://<tailscale-ip-of-pi>:3456
```

## Step 6: Configure Firewall for Tailscale

```bash
# Allow Tailscale traffic
sudo ufw allow in on tailscale0

# Verify
sudo ufw status verbose
```

## Advanced: Split DNS

If you want to use a custom domain:

```bash
# Add to Tailscale DNS settings (admin console)
# vaultkeeper.local -> <tailscale-ip-of-pi>
```

Then configure clients with:
```
Sync Server URL: http://vaultkeeper.local:3456
```

## Troubleshooting

### Tailscale not connecting
```bash
sudo tailscale debug --derp
sudo systemctl restart tailscaled
```

### Key expired
```bash
sudo tailscale up --force-reauth
```

### Can't reach server
```bash
# Verify Tailscale IP
tailscale ip -4

# Test connectivity
ping <tailscale-ip>
curl http://<tailscale-ip>:3456/health
```
