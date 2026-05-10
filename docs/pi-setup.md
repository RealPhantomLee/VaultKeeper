# Raspberry Pi Setup Guide

VaultKeeper has been validated on two OS choices for the Pi 5:

- **[Arch Linux ARM](#arch-linux-arm-current-target)** — the project's current target. Tailscale already joined.
- **[Raspberry Pi OS Lite](#step-1-install-raspberry-pi-os)** — original reference path, kept below.

If you're following the Arch path, jump to that section. The Docker / systemd / Nginx / backup pieces afterward are identical on both.

## Hardware Requirements

- **Raspberry Pi 5** (8GB RAM recommended)
- **USB 3.0 SSD** (256GB+ for vault storage)
- **USB-C Power Supply** (official recommended)
- **Active Cooler** (recommended for sustained loads)
- **Ethernet Cable** (preferred over WiFi)

## Arch Linux ARM (current target)

This is the actual deploy target — Pi 5 already has Arch + Tailscale joined as `cyberdeck.local`. Skip step-by-step OS install; this section just covers the package installs the rest of the guide assumes.

```bash
# SSH in via Tailscale (no port-forwarding required)
ssh roger@cyberdeck.local

# System update
sudo pacman -Syu

# Docker + Compose v2
sudo pacman -S docker docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # log out/in afterward so the group takes effect

# Firewall (UFW lives in the extra repo on Arch)
sudo pacman -S ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow in on tailscale0    # trust the tailnet
sudo ufw allow ssh                 # only if you SSH from outside the tailnet
sudo ufw enable
sudo systemctl enable --now ufw

# fail2ban
sudo pacman -S fail2ban
sudo systemctl enable --now fail2ban

# Build deps for any local cargo work on the Pi (optional)
sudo pacman -S base-devel git curl

# Tailscale: already installed and authenticated. Verify:
tailscale status
```

Mount the SSD (Arch uses the same `fstab` syntax as Debian; pick `ext4` and `noatime`):

```bash
sudo mkfs.ext4 /dev/sda1
sudo mkdir -p /opt/vaultkeeper
echo "/dev/sda1 /opt/vaultkeeper ext4 defaults,noatime 0 2" | sudo tee -a /etc/fstab
sudo mount -a
```

Set the JWT secret. The CI deploy will append `DOCKER_USERNAME` and `IMAGE_TAG` to the same `.env` on every push; only `JWT_SECRET` needs to live here permanently.

```bash
sudo install -d -m 755 -o $USER /opt/vaultkeeper
JWT_SECRET=$(openssl rand -hex 32)
printf "JWT_SECRET=%s\n" "$JWT_SECRET" > /opt/vaultkeeper/.env
chmod 600 /opt/vaultkeeper/.env
```

That's all the Pi needs. The first push to `main` will trigger `.github/workflows/deploy.yml`, which:

1. Builds and pushes a `linux/arm64` image to Docker Hub.
2. SCPs `deploy/compose/docker-compose.prod.yml` to `/opt/vaultkeeper/`.
3. SSHes in, appends `DOCKER_USERNAME` + `IMAGE_TAG` to `.env`, runs `docker compose pull && up -d`, and waits for the container's healthcheck.

Once it succeeds, verify from any tailnet device:

```bash
curl http://cyberdeck.local:3456/health
# {"status":"healthy","version":"0.1.0","uptime":N}
```

The remaining sections below (Raspberry Pi OS path, optional Nginx for public HTTPS) only apply if you outgrow the tailnet-only deployment.

## Step 1: Install Raspberry Pi OS

1. Download **Raspberry Pi OS Lite (64-bit)** from raspberrypi.com
2. Flash to SD card using Raspberry Pi Imager
3. Enable SSH in imager settings
4. Boot and SSH into the Pi

```bash
ssh pi@<raspberry-pi-ip>
```

## Step 2: Initial System Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Set hostname
sudo hostnamectl set-hostname vaultkeeper

# Configure static IP (edit /etc/dhcpcd.conf)
echo "interface eth0" | sudo tee -a /etc/dhcpcd.conf
echo "static ip_address=192.168.1.100/24" | sudo tee -a /etc/dhcpcd.conf
echo "static routers=192.168.1.1" | sudo tee -a /etc/dhcpcd.conf

# Mount USB SSD
sudo mkfs.ext4 /dev/sda1
echo "/dev/sda1 /opt/vaultkeeper ext4 defaults,noatime 0 2" | sudo tee -a /etc/fstab
sudo mount -a
```

## Step 3: Run Setup Script

```bash
# Clone repository
git clone https://github.com/<your-org>/VaultKeeper.git
cd VaultKeeper

# Run setup script
sudo ./deploy/scripts/setup-pi.sh
```

The setup script will:
- Install Docker and Docker Compose
- Configure firewall (UFW)
- Install and configure fail2ban
- Optimize for Raspberry Pi
- Create necessary directories
- Generate JWT secret
- Set up auto-update service
- Configure backup cron job

## Step 4: Deploy Services

```bash
cd /opt/vaultkeeper

# Copy docker-compose.yml
cp /path/to/VaultKeeper/deploy/compose/docker-compose.yml .

# Start services
docker compose up -d

# Verify deployment
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime": 5
}
```

## Step 5: (Optional) Install Tailscale

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Authenticate
sudo tailscale up

# Verify
tailscale status
```

## Step 6: Configure Nginx SSL (Optional)

For production use with public HTTPS:

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d vaultkeeper.yourdomain.com

# Configure Nginx to use certificates
sudo mkdir -p /opt/vaultkeeper/certs
sudo cp /etc/letsencrypt/live/vaultkeeper.yourdomain.com/fullchain.pem /opt/vaultkeeper/certs/
sudo cp /etc/letsencrypt/live/vaultkeeper.yourdomain.com/privkey.pem /opt/vaultkeeper/certs/

# Restart Nginx
docker compose restart nginx
```

## Verification Checklist

- [ ] Docker services running (`docker compose ps`)
- [ ] Health check passing (`curl http://localhost:8080/health`)
- [ ] Firewall configured (`sudo ufw status`)
- [ ] fail2ban running (`sudo systemctl status fail2ban`)
- [ ] Auto-update timer active (`systemctl list-timers | grep vaultkeeper`)
- [ ] Backup cron configured (`cat /etc/cron.d/vaultkeeper-backup`)
- [ ] Tailscale connected (if installed) (`tailscale status`)
- [ ] SSL certificates valid (if configured)

## Troubleshooting

### Container won't start
```bash
docker compose logs sync-server
docker compose restart sync-server
```

### Disk space issues
```bash
docker system prune -af
df -h /opt/vaultkeeper
```

### High memory usage
```bash
htop
docker stats
```

### Database corruption
```bash
docker exec vaultkeeper-sync sqlite3 /opt/vaultkeeper/data/vaultkeeper.db "PRAGMA integrity_check;"
```
