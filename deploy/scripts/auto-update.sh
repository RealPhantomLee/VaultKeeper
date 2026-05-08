#!/bin/bash
set -euo pipefail

VAULTKEEPER_DIR="/opt/vaultkeeper"
LOG_FILE="${VAULTKEEPER_DIR}/logs/auto-update.log"
COMPOSE_FILE="${VAULTKEEPER_DIR}/docker-compose.yml"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_docker() {
    if ! command -v docker &>/dev/null; then
        log "ERROR: Docker not installed"
        exit 1
    fi
    if ! command -v docker compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
        log "ERROR: Docker Compose not available"
        exit 1
    fi
}

update_containers() {
    log "Checking for updates..."

    cd "$VAULTKEEPER_DIR"

    docker compose pull --quiet

    local updated
    updated=$(docker compose images --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}" 2>/dev/null | grep -c "vaultkeeper" || true)

    if [[ $updated -gt 0 ]]; then
        log "Updates available, restarting containers..."
        docker compose up -d --remove-orphans
        log "Containers updated successfully"

        docker image prune -f
        log "Pruned unused images"
    else
        log "No updates available"
    fi
}

check_health() {
    log "Checking service health..."

    local response
    response=$(curl -sf http://localhost:8080/health 2>/dev/null || echo "")

    if [[ -n "$response" ]]; then
        log "Service is healthy: $response"
    else
        log "WARNING: Service health check failed"
        log "Attempting restart..."
        docker compose restart sync-server
        sleep 5
        response=$(curl -sf http://localhost:8080/health 2>/dev/null || echo "")
        if [[ -n "$response" ]]; then
            log "Service recovered after restart"
        else
            log "ERROR: Service failed to recover"
        fi
    fi
}

main() {
    log "Starting auto-update check"

    check_docker
    update_containers
    check_health

    log "Auto-update check complete"
}

main "$@"
