#!/bin/bash
set -euo pipefail

# VaultKeeper Raspberry Pi Setup Script
# Target: Raspberry Pi 5, Raspberry Pi OS Lite (64-bit)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

check_pi() {
    if ! grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
        log_warn "Not running on Raspberry Pi. Continuing anyway..."
    fi
}

install_dependencies() {
    log_info "Updating package lists..."
    apt-get update

    log_info "Installing dependencies..."
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        git \
        sqlite3 \
        tar \
        cron \
        fail2ban \
        ufw \
        htop \
        net-tools

    log_info "Dependencies installed"
}

install_docker() {
    if command -v docker &>/dev/null; then
        log_info "Docker already installed, skipping..."
        return
    fi

    log_info "Installing Docker..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    log_info "Docker installed successfully"
}

configure_firewall() {
    log_info "Configuring firewall..."

    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 8080/tcp
    ufw allow 8443/tcp

    if command -v tailscale &>/dev/null; then
        ufw allow in on tailscale0
    fi

    echo "y" | ufw enable
    log_info "Firewall configured"
}

configure_fail2ban() {
    log_info "Configuring fail2ban..."

    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
EOF

    systemctl enable fail2ban
    systemctl restart fail2ban
    log_info "fail2ban configured"
}

optimize_pi() {
    log_info "Optimizing for Raspberry Pi..."

    if [[ -f /boot/firmware/config.txt ]] || [[ -f /boot/config.txt ]]; then
        local config_file="/boot/firmware/config.txt"
        [[ -f "$config_file" ]] || config_file="/boot/config.txt"

        if ! grep -q "gpu_mem=16" "$config_file"; then
            echo "gpu_mem=16" >> "$config_file"
        fi
        if ! grep -q "dtoverlay=disable-wifi" "$config_file" 2>/dev/null; then
            if [[ -n "${DISABLE_WIFI:-}" ]]; then
                echo "dtoverlay=disable-wifi" >> "$config_file"
            fi
        fi
    fi

    sysctl -w vm.swappiness=10
    echo "vm.swappiness=10" >> /etc/sysctl.conf

    log_info "Optimizations applied"
}

create_directories() {
    log_info "Creating directories..."

    mkdir -p /opt/vaultkeeper/{data,backups,certs,logs}
    chown -R 1000:1000 /opt/vaultkeeper
    chmod -R 755 /opt/vaultkeeper

    log_info "Directories created"
}

generate_jwt_secret() {
    if [[ -f /opt/vaultkeeper/.env ]]; then
        log_info ".env file already exists, skipping JWT generation..."
        return
    fi

    log_info "Generating JWT secret..."
    local jwt_secret
    jwt_secret=$(openssl rand -base64 48)

    cat > /opt/vaultkeeper/.env << EOF
# VaultKeeper Server Configuration
SYNC_PORT=3456
RUST_LOG=info
JWT_SECRET=${jwt_secret}
NGINX_HTTP_PORT=8080
NGINX_HTTPS_PORT=8443
SSL_CERT_PATH=./certs
DATA_DIR=/opt/vaultkeeper/data
BACKUP_DIR=/opt/vaultkeeper/backups
BACKUP_RETENTION_DAYS=30
BACKUP_INTERVAL_HOURS=6
EOF

    chmod 600 /opt/vaultkeeper/.env
    log_info "JWT secret generated"
}

setup_auto_update() {
    log_info "Setting up auto-update service..."

    cp deploy/systemd/vaultkeeper-update.service /etc/systemd/system/
    cp deploy/systemd/vaultkeeper-update.timer /etc/systemd/system/

    systemctl daemon-reload
    systemctl enable vaultkeeper-update.timer
    systemctl start vaultkeeper-update.timer

    log_info "Auto-update service configured"
}

setup_backup_cron() {
    log_info "Setting up backup cron job..."

    cat > /etc/cron.d/vaultkeeper-backup << 'EOF'
0 */6 * * * root /opt/vaultkeeper/scripts/backup.sh >> /opt/vaultkeeper/logs/backup.log 2>&1
0 0 * * 0 root find /opt/vaultkeeper/backups -name "*.tar.gz" -mtime +30 -delete
EOF

    chmod 644 /etc/cron.d/vaultkeeper-backup
    log_info "Backup cron configured"
}

print_summary() {
    echo ""
    log_info "VaultKeeper setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Copy your docker-compose.yml to /opt/vaultkeeper/"
    echo "  2. Copy nginx config: deploy/nginx/vaultkeeper.conf"
    echo "  3. Run: cd /opt/vaultkeeper && docker compose up -d"
    echo "  4. Configure Tailscale (optional): sudo tailscale up"
    echo ""
    echo "Services:"
    echo "  - Sync server: http://localhost:8080"
    echo "  - Health check: http://localhost:8080/health"
    echo ""
}

main() {
    log_info "Starting VaultKeeper Raspberry Pi setup..."

    check_root
    check_pi
    install_dependencies
    install_docker
    configure_firewall
    configure_fail2ban
    optimize_pi
    create_directories
    generate_jwt_secret
    setup_auto_update
    setup_backup_cron

    print_summary
}

main "$@"
