# Raspberry Pi Setup Guide

## Hardware Requirements

- **Raspberry Pi 5** (8GB RAM recommended)
- **USB 3.0 SSD** (256GB+ for vault storage)
- **USB-C Power Supply** (official recommended)
- **Active Cooler** (recommended for sustained loads)
- **Ethernet Cable** (preferred over WiFi)

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
