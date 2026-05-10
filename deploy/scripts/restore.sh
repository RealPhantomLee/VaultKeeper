#!/bin/bash
set -euo pipefail

# VaultKeeper restore script.
# Inverse of backup.sh — takes a backup tarball or .db file and restores it
# into the live data directory.
#
# Usage:
#   restore.sh <path-to-backup.tar.gz>
#   restore.sh <path-to-db_backup.sql.gz>
#   restore.sh <path-to-db_backup.db>
#
# Refuses to run if the sync server container is up — stop it first.

VAULTKEEPER_DIR="/opt/vaultkeeper"
DATA_DIR="${VAULTKEEPER_DIR}/data"
BACKUP_DIR="${VAULTKEEPER_DIR}/backups"
LOG_FILE="${VAULTKEEPER_DIR}/logs/restore.log"
CONTAINER_NAME="${CONTAINER_NAME:-vaultkeeper-sync}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

usage() {
    cat <<EOF
Usage: $0 <backup-file>

Accepts:
  *.tar.gz                full data-dir tarball (created by backup.sh)
  *.sql.gz / *.sql        sqlite3 .dump output
  *.db                    raw sqlite database file copy

The script will:
  1. Verify the container is stopped
  2. Move the existing data directory to data.bak.<timestamp>
  3. Restore from the supplied file
  4. Print next steps to bring the container back up

Stop the container first:
  docker compose -f deploy/compose/docker-compose.yml stop sync-server
EOF
}

require_container_stopped() {
    if command -v docker >/dev/null 2>&1; then
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER_NAME"; then
            log "ERROR: container '$CONTAINER_NAME' is running. Stop it first:"
            log "  docker compose -f deploy/compose/docker-compose.yml stop sync-server"
            exit 1
        fi
    fi
}

verify_tarball() {
    local f="$1"
    if ! tar -tzf "$f" >/dev/null 2>&1; then
        log "ERROR: Tarball failed verification: $f"
        exit 1
    fi
    log "Tarball verified: $f"
}

snapshot_existing_data() {
    if [[ -d "$DATA_DIR" ]] && [[ -n "$(ls -A "$DATA_DIR" 2>/dev/null || true)" ]]; then
        local ts
        ts=$(date '+%Y%m%d_%H%M%S')
        local snap="${DATA_DIR}.bak.${ts}"
        log "Snapshotting existing data to: $snap"
        mv "$DATA_DIR" "$snap"
    fi
    mkdir -p "$DATA_DIR"
}

restore_tarball() {
    local f="$1"
    log "Extracting tarball into $DATA_DIR"
    tar -xzf "$f" -C "$DATA_DIR"
    log "Tarball restored"
}

restore_sql_dump() {
    local f="$1"
    local target="${DATA_DIR}/vaultkeeper.db"
    if [[ ! -d "$DATA_DIR" ]]; then
        mkdir -p "$DATA_DIR"
    fi
    log "Restoring SQL dump into $target"
    if [[ "$f" == *.gz ]]; then
        gunzip -c "$f" | sqlite3 "$target"
    else
        sqlite3 "$target" < "$f"
    fi
    log "SQL dump restored"
}

restore_raw_db() {
    local f="$1"
    local target="${DATA_DIR}/vaultkeeper.db"
    if [[ ! -d "$DATA_DIR" ]]; then
        mkdir -p "$DATA_DIR"
    fi
    log "Copying raw database to $target"
    cp "$f" "$target"
    log "Raw database restored"
}

main() {
    if [[ $# -ne 1 ]]; then
        usage
        exit 2
    fi

    local source="$1"

    if [[ ! -f "$source" ]]; then
        log "ERROR: backup file not found: $source"
        exit 1
    fi

    mkdir -p "$(dirname "$LOG_FILE")"
    log "Starting restore from: $source"

    require_container_stopped

    case "$source" in
        *.tar.gz|*.tgz)
            verify_tarball "$source"
            snapshot_existing_data
            restore_tarball "$source"
            ;;
        *.sql|*.sql.gz)
            snapshot_existing_data
            restore_sql_dump "$source"
            ;;
        *.db)
            snapshot_existing_data
            restore_raw_db "$source"
            ;;
        *)
            log "ERROR: unrecognized backup format: $source"
            usage
            exit 2
            ;;
    esac

    log "Restore complete."
    log ""
    log "Next steps:"
    log "  docker compose -f deploy/compose/docker-compose.yml up -d sync-server"
    log "  curl -fsS http://localhost:3456/health"
}

main "$@"
