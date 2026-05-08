use sqlx::{Sqlite, SqlitePool};
use tracing;

pub async fn create_pool(database_url: &str) -> anyhow::Result<SqlitePool> {
    let pool = SqlitePool::connect(database_url).await?;
    tracing::info!("Connected to database");
    Ok(pool)
}

pub async fn run_migrations(pool: &SqlitePool) -> anyhow::Result<()> {
    tracing::info!("Running database migrations");

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS devices (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            name TEXT NOT NULL,
            platform TEXT NOT NULL,
            public_key TEXT NOT NULL,
            last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
            registered_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(user_id, name)
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS vaults (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id),
            name TEXT NOT NULL,
            sync_version INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sync_operations (
            id TEXT PRIMARY KEY,
            vault_id TEXT NOT NULL REFERENCES vaults(id),
            device_id TEXT NOT NULL REFERENCES devices(id),
            operation_type TEXT NOT NULL,
            path TEXT NOT NULL,
            content_hash TEXT NOT NULL,
            content BLOB,
            version INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            synced_at TEXT
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sync_conflicts (
            id TEXT PRIMARY KEY,
            vault_id TEXT NOT NULL REFERENCES vaults(id),
            path TEXT NOT NULL,
            local_device_id TEXT NOT NULL REFERENCES devices(id),
            remote_device_id TEXT NOT NULL REFERENCES devices(id),
            local_hash TEXT NOT NULL,
            remote_hash TEXT NOT NULL,
            local_content BLOB,
            remote_content BLOB,
            resolved INTEGER NOT NULL DEFAULT 0,
            resolution TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            resolved_at TEXT
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sync_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vault_id TEXT NOT NULL REFERENCES vaults(id),
            device_id TEXT NOT NULL REFERENCES devices(id),
            operation TEXT NOT NULL,
            details TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS backups (
            id TEXT PRIMARY KEY,
            vault_id TEXT NOT NULL REFERENCES vaults(id),
            path TEXT NOT NULL,
            size INTEGER NOT NULL,
            compressed INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'completed',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_sync_ops_vault ON sync_operations(vault_id);
        CREATE INDEX IF NOT EXISTS idx_sync_ops_device ON sync_operations(device_id);
        CREATE INDEX IF NOT EXISTS idx_sync_ops_status ON sync_operations(status);
        CREATE INDEX IF NOT EXISTS idx_conflicts_vault ON sync_conflicts(vault_id);
        CREATE INDEX IF NOT EXISTS idx_conflicts_resolved ON sync_conflicts(resolved);
        CREATE INDEX IF NOT EXISTS idx_logs_vault ON sync_logs(vault_id);
        CREATE INDEX IF NOT EXISTS idx_backups_vault ON backups(vault_id);
        "#,
    )
    .execute(pool)
    .await?;

    tracing::info!("Migrations completed");
    Ok(())
}
