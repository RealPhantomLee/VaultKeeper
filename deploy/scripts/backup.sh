#!/bin/bash
set -euo pipefail

VAULTKEEPER_DIR="/opt/vaultkeeper"
DATA_DIR="${VAULTKEEPER_DIR}/data"
BACKUP_DIR="${VAULTKEEPER_DIR}/backups"
LOG_FILE="${VAULTKEEPER_DIR}/logs/backup.log"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
MAX_BACKUPS=${MAX_BACKUPS:-10}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

create_backup() {
    local timestamp
    timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_name="backup_${timestamp}"
    local backup_path="${BACKUP_DIR}/${backup_name}.tar.gz"

    log "Creating backup: ${backup_name}"

    if [[ ! -d "$DATA_DIR" ]]; then
        log "ERROR: Data directory not found: $DATA_DIR"
        exit 1
    fi

    tar -czf "$backup_path" -C "$DATA_DIR" . 2>/dev/null || {
        log "ERROR: Failed to create backup"
        exit 1
    }

    local size
    size=$(du -sh "$backup_path" | cut -f1)
    log "Backup created: ${backup_path} (${size})"

    echo "$backup_path"
}

backup_database() {
    local timestamp
    timestamp=$(date '+%Y%m%d_%H%M%S')
    local db_backup="${BACKUP_DIR}/db_backup_${timestamp}.sql"

    log "Backing up database..."

    docker exec vaultkeeper-sync sqlite3 /opt/vaultkeeper/data/vaultkeeper.db ".dump" > "$db_backup" 2>/dev/null || {
        if [[ -f "${DATA_DIR}/vaultkeeper.db" ]]; then
            cp "${DATA_DIR}/vaultkeeper.db" "${BACKUP_DIR}/db_backup_${timestamp}.db"
            log "Database backup created (file copy): ${BACKUP_DIR}/db_backup_${timestamp}.db"
        else
            log "WARNING: Database not found for backup"
            return 1
        fi
    }

    if [[ -f "$db_backup" ]]; then
        gzip "$db_backup"
        log "Database backup created: ${db_backup}.gz"
    fi
}

cleanup_old_backups() {
    log "Cleaning up old backups (retention: ${RETENTION_DAYS} days, max: ${MAX_BACKUPS})"

    find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "db_backup_*" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

    local backup_count
    backup_count=$(find "$BACKUP_DIR" -name "backup_*.tar.gz" | wc -l)

    if [[ $backup_count -gt $MAX_BACKUPS ]]; then
        local to_delete=$((backup_count - MAX_BACKUPS))
        find "$BACKUP_DIR" -name "backup_*.tar.gz" -printf '%T+ %p\n' | \
            sort | head -n "$to_delete" | awk '{print $2}' | xargs rm -f
        log "Deleted $to_delete old backups"
    fi

    log "Cleanup complete"
}

verify_backup() {
    local backup_path="$1"

    if [[ ! -f "$backup_path" ]]; then
        log "ERROR: Backup file not found: $backup_path"
        return 1
    fi

    if ! tar -tzf "$backup_path" >/dev/null 2>&1; then
        log "ERROR: Backup verification failed: $backup_path"
        return 1
    fi

    log "Backup verified: $backup_path"
    return 0
}

main() {
    log "Starting backup process"

    local backup_path
    backup_path=$(create_backup)

    verify_backup "$backup_path"

    backup_database || log "WARNING: Database backup failed"

    cleanup_old_backups

    local total_size
    total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
    local backup_count
    backup_count=$(find "$BACKUP_DIR" -name "backup_*.tar.gz" | wc -l)

    log "Backup complete. Total backups: $backup_count, Total size: $total_size"
}

main "$@"
