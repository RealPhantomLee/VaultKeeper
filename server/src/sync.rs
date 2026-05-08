use std::path::PathBuf;
use sqlx::SqlitePool;
use tracing;

pub struct SyncManager {
    pool: SqlitePool,
    data_dir: PathBuf,
}

impl SyncManager {
    pub fn new(pool: SqlitePool, data_dir: String) -> Self {
        Self {
            pool,
            data_dir: PathBuf::from(data_dir),
        }
    }

    pub async fn apply_operation(
        &self,
        vault_id: &str,
        path: &str,
        content: Option<&[u8]>,
        operation_type: &str,
    ) -> anyhow::Result<()> {
        let file_path = self.data_dir.join(vault_id).join(path);

        match operation_type {
            "create" | "update" => {
                if let Some(parent) = file_path.parent() {
                    tokio::fs::create_dir_all(parent).await?;
                }
                if let Some(data) = content {
                    tokio::fs::write(&file_path, data).await?;
                }
            }
            "delete" => {
                if file_path.exists() {
                    tokio::fs::remove_file(&file_path).await?;
                }
            }
            _ => {
                return Err(anyhow::anyhow!("Unknown operation type: {}", operation_type));
            }
        }

        tracing::info!("Applied {} operation for {}", operation_type, path);
        Ok(())
    }

    pub async fn get_pending_operations(
        &self,
        vault_id: &str,
        device_id: &str,
        last_version: i64,
    ) -> anyhow::Result<Vec<crate::models::SyncOperation>> {
        let ops: Vec<crate::models::SyncOperation> = sqlx::query_as(
            "SELECT * FROM sync_operations WHERE vault_id = ? AND device_id != ? AND version > ? AND status = 'synced' ORDER BY version ASC",
        )
        .bind(vault_id)
        .bind(device_id)
        .bind(last_version)
        .fetch_all(&self.pool)
        .await?;

        Ok(ops)
    }

    pub async fn create_backup(&self, vault_id: &str, backup_dir: &str) -> anyhow::Result<String> {
        let backup_id = uuid::Uuid::new_v4().to_string();
        let vault_path = self.data_dir.join(vault_id);
        let backup_path = PathBuf::from(backup_dir).join(format!("{}.tar.gz", backup_id));

        if !vault_path.exists() {
            return Err(anyhow::anyhow!("Vault directory does not exist"));
        }

        let output = tokio::process::Command::new("tar")
            .args([
                "-czf",
                backup_path.to_str().unwrap(),
                "-C",
                self.data_dir.to_str().unwrap(),
                vault_id,
            ])
            .output()
            .await?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("Backup failed"));
        }

        let size = tokio::fs::metadata(&backup_path).await?.len() as i64;

        sqlx::query(
            "INSERT INTO backups (id, vault_id, path, size, compressed, status) VALUES (?, ?, ?, ?, 1, 'completed')",
        )
        .bind(&backup_id)
        .bind(vault_id)
        .bind(backup_path.to_str().unwrap())
        .bind(size)
        .execute(&self.pool)
        .await?;

        tracing::info!("Created backup {} for vault {}", backup_id, vault_id);
        Ok(backup_id)
    }

    pub async fn cleanup_old_backups(&self, max_backups: i64) -> anyhow::Result<()> {
        let to_delete: Vec<(String, String)> = sqlx::query_as(
            "SELECT id, path FROM backups WHERE id IN (SELECT id FROM backups ORDER BY created_at DESC LIMIT -1 OFFSET ?)",
        )
        .bind(max_backups)
        .fetch_all(&self.pool)
        .await?;

        for (id, path) in to_delete {
            if tokio::fs::remove_file(&path).await.is_ok() {
                sqlx::query("DELETE FROM backups WHERE id = ?")
                    .bind(&id)
                    .execute(&self.pool)
                    .await?;
            }
        }

        Ok(())
    }
}
