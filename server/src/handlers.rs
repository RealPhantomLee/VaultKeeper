use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use axum::{
    extract::{Path, State, WebSocketUpgrade},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde_json::json;
use sqlx::Row;

use crate::AppState;
use crate::middleware::AuthClaims;
use crate::models::*;

static START_TIME: std::sync::LazyLock<u64> = std::sync::LazyLock::new(|| {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
});

pub async fn health_check() -> Json<HealthCheckResponse> {
    let uptime = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
        - *START_TIME;

    Json(HealthCheckResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime,
    })
}

pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiError>)> {
    let username = req["username"].as_str().ok_or((
        StatusCode::BAD_REQUEST,
        Json(ApiError {
            code: "INVALID_INPUT".to_string(),
            message: "username is required".to_string(),
        }),
    ))?;

    let password = req["password"].as_str().ok_or((
        StatusCode::BAD_REQUEST,
        Json(ApiError {
            code: "INVALID_INPUT".to_string(),
            message: "password is required".to_string(),
        }),
    ))?;

    let password_hash = hash_password(password).map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                code: "HASH_ERROR".to_string(),
                message: "Failed to hash password".to_string(),
            }),
        )
    })?;

    let id = uuid::Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)",
    )
    .bind(&id)
    .bind(username)
    .bind(&password_hash)
    .execute(&state.pool)
    .await
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            (
                StatusCode::CONFLICT,
                Json(ApiError {
                    code: "USERNAME_EXISTS".to_string(),
                    message: "Username already exists".to_string(),
                }),
            )
        } else {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    code: "DB_ERROR".to_string(),
                    message: "Database error".to_string(),
                }),
            )
        }
    })?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(json!({ "id": id, "username": username })),
        error: None,
        timestamp: Utc::now().to_rfc3339(),
    }))
}

pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(req): Json<AuthRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, Json<ApiError>)> {
    let user: Option<(String, String)> = sqlx::query_as(
        "SELECT id, password_hash FROM users WHERE username = ?",
    )
    .bind(&req.username)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                code: "DB_ERROR".to_string(),
                message: "Database error".to_string(),
            }),
        )
    })?;

    let (user_id, password_hash) = user.ok_or((
        StatusCode::UNAUTHORIZED,
        Json(ApiError {
            code: "INVALID_CREDENTIALS".to_string(),
            message: "Invalid username or password".to_string(),
        }),
    ))?;

    if !verify_password(&req.password, &password_hash) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ApiError {
                code: "INVALID_CREDENTIALS".to_string(),
                message: "Invalid username or password".to_string(),
            }),
        ));
    }

    let device = register_or_update_device(&state, &req, &user_id)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    code: "DEVICE_ERROR".to_string(),
                    message: "Failed to register device".to_string(),
                }),
            )
        })?;

    let claims = AuthClaims {
        user_id,
        device_id: device.id.clone(),
        exp: (Utc::now().timestamp() + 86400 * 30) as usize,
    };

    let token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &claims,
        &jsonwebtoken::EncodingKey::from_secret(state.jwt_secret.as_bytes()),
    )
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                code: "TOKEN_ERROR".to_string(),
                message: "Failed to generate token".to_string(),
            }),
        )
    })?;

    Ok(Json(AuthResponse {
        token,
        device_id: device.id,
        expires_at: Utc::now()
            .checked_add_days(chrono::Days::new(30))
            .unwrap()
            .to_rfc3339(),
        sync_version: 0,
    }))
}

pub async fn register_device(
    State(state): State<Arc<AppState>>,
    claims: AuthClaims,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiError>)> {
    let id = uuid::Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO devices (id, user_id, name, platform, public_key) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&claims.user_id)
    .bind(req["name"].as_str().unwrap_or("unknown"))
    .bind(req["platform"].as_str().unwrap_or("unknown"))
    .bind(req["public_key"].as_str().unwrap_or(""))
    .execute(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                code: "DB_ERROR".to_string(),
                message: "Failed to register device".to_string(),
            }),
        )
    })?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(json!({ "device_id": id })),
        error: None,
        timestamp: Utc::now().to_rfc3339(),
    }))
}

pub async fn sync(
    State(state): State<Arc<AppState>>,
    claims: AuthClaims,
    Json(req): Json<SyncRequest>,
) -> Result<Json<SyncResponse>, (StatusCode, Json<ApiError>)> {
    // Reject requests where the body's device_id disagrees with the JWT — prevents
    // replay of one device's token from another device.
    if req.device_id != claims.device_id {
        return Err((
            StatusCode::FORBIDDEN,
            Json(ApiError {
                code: "DEVICE_MISMATCH".to_string(),
                message: "Request device_id does not match authenticated device".to_string(),
            }),
        ));
    }

    sqlx::query("UPDATE devices SET last_seen_at = datetime('now') WHERE id = ?")
        .bind(&claims.device_id)
        .execute(&state.pool)
        .await
        .ok();

    let mut tx = state.pool.begin().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                code: "DB_ERROR".to_string(),
                message: "Failed to start transaction".to_string(),
            }),
        )
    })?;

    let new_version = sqlx::query(
        "UPDATE vaults SET sync_version = sync_version + 1, updated_at = datetime('now') WHERE id = ? RETURNING sync_version",
    )
    .bind(&req.vault_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|_| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError {
                code: "VAULT_NOT_FOUND".to_string(),
                message: "Vault not found".to_string(),
            }),
        )
    })?
    .get::<i64, _>(0);

    let mut server_ops = Vec::new();
    let mut conflicts = Vec::new();

    for op in &req.operations {
        let exists: Option<(String, String)> = sqlx::query_as(
            "SELECT content_hash, status FROM sync_operations WHERE vault_id = ? AND path = ? ORDER BY version DESC LIMIT 1",
        )
        .bind(&req.vault_id)
        .bind(&op.path)
        .fetch_optional(&mut *tx)
        .await
        .ok()
        .flatten();

        if let Some((existing_hash, status)) = &exists {
            if existing_hash != &op.hash && status == "synced" {
                let conflict_id = uuid::Uuid::new_v4().to_string();
                sqlx::query(
                    "INSERT INTO sync_conflicts (id, vault_id, path, local_device_id, remote_device_id, local_hash, remote_hash) VALUES (?, ?, ?, ?, ?, ?, ?)",
                )
                .bind(&conflict_id)
                .bind(&req.vault_id)
                .bind(&op.path)
                .bind(&claims.device_id)
                .bind(&op.device_id)
                .bind(existing_hash)
                .bind(&op.hash)
                .execute(&mut *tx)
                .await
                .ok();

                conflicts.push(SyncConflictResponse {
                    id: conflict_id,
                    path: op.path.clone(),
                    local_hash: existing_hash.clone(),
                    remote_hash: op.hash.clone(),
                    created_at: Utc::now().to_rfc3339(),
                });

                sqlx::query(
                    "INSERT INTO sync_operations (id, vault_id, device_id, operation_type, path, content_hash, content, version, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'conflict')",
                )
                .bind(&op.id)
                .bind(&req.vault_id)
                .bind(&claims.device_id)
                .bind(&op.r#type)
                .bind(&op.path)
                .bind(&op.hash)
                .bind(op.content.as_ref().map(|c| c.as_bytes()))
                .bind(new_version)
                .execute(&mut *tx)
                .await
                .ok();

                continue;
            }
        }

        sqlx::query(
            "INSERT INTO sync_operations (id, vault_id, device_id, operation_type, path, content_hash, content, version, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced')",
        )
        .bind(&op.id)
        .bind(&req.vault_id)
        .bind(&claims.device_id)
        .bind(&op.r#type)
        .bind(&op.path)
        .bind(&op.hash)
        .bind(op.content.as_ref().map(|c| c.as_bytes()))
        .bind(new_version)
        .execute(&mut *tx)
        .await
        .ok();

        server_ops.push(SyncOperationResponse {
            id: op.id.clone(),
            r#type: op.r#type.clone(),
            path: op.path.clone(),
            content: op.content.clone(),
            hash: op.hash.clone(),
            version: new_version,
        });
    }

    tx.commit().await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                code: "DB_ERROR".to_string(),
                message: "Failed to commit transaction".to_string(),
            }),
        )
    })?;

    Ok(Json(SyncResponse {
        success: true,
        new_sync_version: new_version,
        operations: server_ops,
        conflicts,
        server_time: Utc::now().to_rfc3339(),
    }))
}

pub async fn sync_status(
    State(state): State<Arc<AppState>>,
    claims: AuthClaims,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiError>)> {
    let conflicts: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sync_conflicts WHERE resolved = 0",
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    let pending: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sync_operations WHERE status = 'pending'",
    )
    .fetch_one(&state.pool)
    .await
    .unwrap_or(0);

    Ok(Json(ApiResponse {
        success: true,
        data: Some(json!({
            "pending_operations": pending,
            "conflicts": conflicts,
            "device_id": claims.device_id,
        })),
        error: None,
        timestamp: Utc::now().to_rfc3339(),
    }))
}

pub async fn get_conflicts(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ApiResponse<Vec<SyncConflict>>>, (StatusCode, Json<ApiError>)> {
    let conflicts: Vec<SyncConflict> = sqlx::query_as(
        "SELECT * FROM sync_conflicts WHERE resolved = 0 ORDER BY created_at DESC",
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    Ok(Json(ApiResponse {
        success: true,
        data: Some(conflicts),
        error: None,
        timestamp: Utc::now().to_rfc3339(),
    }))
}

pub async fn resolve_conflict(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiError>)> {
    let resolution = req["resolution"].as_str().unwrap_or("local");

    sqlx::query(
        "UPDATE sync_conflicts SET resolved = 1, resolution = ?, resolved_at = datetime('now') WHERE id = ?",
    )
    .bind(resolution)
    .bind(&id)
    .execute(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError {
                code: "DB_ERROR".to_string(),
                message: "Failed to resolve conflict".to_string(),
            }),
        )
    })?;

    Ok(Json(ApiResponse {
        success: true,
        data: None,
        error: None,
        timestamp: Utc::now().to_rfc3339(),
    }))
}

pub async fn list_vaults(
    State(state): State<Arc<AppState>>,
    claims: AuthClaims,
) -> Result<Json<ApiResponse<Vec<Vault>>>, (StatusCode, Json<ApiError>)> {
    let vaults: Vec<Vault> = sqlx::query_as("SELECT * FROM vaults WHERE user_id = ?")
        .bind(&claims.user_id)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    Ok(Json(ApiResponse {
        success: true,
        data: Some(vaults),
        error: None,
        timestamp: Utc::now().to_rfc3339(),
    }))
}

pub async fn create_vault(
    State(state): State<Arc<AppState>>,
    claims: AuthClaims,
    Json(req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<Vault>>, (StatusCode, Json<ApiError>)> {
    let id = uuid::Uuid::new_v4().to_string();
    let name = req["name"].as_str().unwrap_or("Untitled");

    sqlx::query("INSERT INTO vaults (id, user_id, name) VALUES (?, ?, ?)")
        .bind(&id)
        .bind(&claims.user_id)
        .bind(name)
        .execute(&state.pool)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    code: "DB_ERROR".to_string(),
                    message: "Failed to create vault".to_string(),
                }),
            )
        })?;

    Ok(Json(ApiResponse {
        success: true,
        data: Some(Vault {
            id,
            user_id: claims.user_id,
            name: name.to_string(),
            sync_version: 0,
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
        }),
        error: None,
        timestamp: Utc::now().to_rfc3339(),
    }))
}

pub async fn get_vault(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<ApiResponse<Vault>>, (StatusCode, Json<ApiError>)> {
    let vault: Option<Vault> = sqlx::query_as("SELECT * FROM vaults WHERE id = ?")
        .bind(&id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError {
                    code: "DB_ERROR".to_string(),
                    message: "Database error".to_string(),
                }),
            )
        })?;

    match vault {
        Some(v) => Ok(Json(ApiResponse {
            success: true,
            data: Some(v),
            error: None,
            timestamp: Utc::now().to_rfc3339(),
        })),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(ApiError {
                code: "VAULT_NOT_FOUND".to_string(),
                message: "Vault not found".to_string(),
            }),
        )),
    }
}

pub async fn list_backups(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ApiResponse<Vec<Backup>>>, (StatusCode, Json<ApiError>)> {
    let backups: Vec<Backup> =
        sqlx::query_as("SELECT * FROM backups ORDER BY created_at DESC LIMIT 50")
            .fetch_all(&state.pool)
            .await
            .unwrap_or_default();

    Ok(Json(ApiResponse {
        success: true,
        data: Some(backups),
        error: None,
        timestamp: Utc::now().to_rfc3339(),
    }))
}

pub async fn create_backup(
    State(_state): State<Arc<AppState>>,
    Json(_req): Json<serde_json::Value>,
) -> Result<Json<ApiResponse<serde_json::Value>>, (StatusCode, Json<ApiError>)> {
    // TODO: wire SyncManager::create_backup once routes know which vault to back up.
    let id = uuid::Uuid::new_v4().to_string();

    Ok(Json(ApiResponse {
        success: true,
        data: Some(json!({ "backup_id": id })),
        error: None,
        timestamp: Utc::now().to_rfc3339(),
    }))
}

pub async fn list_devices(
    State(state): State<Arc<AppState>>,
    claims: AuthClaims,
) -> Result<Json<ApiResponse<Vec<Device>>>, (StatusCode, Json<ApiError>)> {
    let devices: Vec<Device> = sqlx::query_as("SELECT * FROM devices WHERE user_id = ?")
        .bind(&claims.user_id)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    Ok(Json(ApiResponse {
        success: true,
        data: Some(devices),
        error: None,
        timestamp: Utc::now().to_rfc3339(),
    }))
}

pub async fn ws_sync(
    State(_state): State<Arc<AppState>>,
    upgrade: WebSocketUpgrade,
) -> impl IntoResponse {
    upgrade.on_upgrade(crate::ws::handle_ws_connection)
}

fn hash_password(password: &str) -> anyhow::Result<String> {
    use argon2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Algorithm, Argon2, Params, Version,
    };

    // Pi 5-tuned: 64 MiB memory, 2 iterations, 1 lane.
    // Stays under load with 4 cores while keeping ~250ms per hash.
    let params = Params::new(64 * 1024, 2, 1, None)
        .map_err(|e| anyhow::anyhow!("argon2 params: {e}"))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let salt = SaltString::generate(&mut OsRng);
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| anyhow::anyhow!("argon2 hash failed: {e}"))?;
    Ok(hash.to_string())
}

fn verify_password(password: &str, hash: &str) -> bool {
    use argon2::{
        password_hash::{PasswordHash, PasswordVerifier},
        Argon2,
    };

    let Ok(parsed_hash) = PasswordHash::new(hash) else {
        return false;
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

async fn register_or_update_device(
    state: &AppState,
    req: &AuthRequest,
    user_id: &str,
) -> anyhow::Result<Device> {
    let existing: Option<Device> = sqlx::query_as(
        "SELECT * FROM devices WHERE user_id = ? AND name = ?",
    )
    .bind(user_id)
    .bind(&req.device_name)
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten();

    if let Some(device) = existing {
        sqlx::query("UPDATE devices SET last_seen_at = datetime('now') WHERE id = ?")
            .bind(&device.id)
            .execute(&state.pool)
            .await
            .ok();
        return Ok(device);
    }

    let id = req.device_id.clone();
    sqlx::query(
        "INSERT INTO devices (id, user_id, name, platform, public_key) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(user_id)
    .bind(&req.device_name)
    .bind("unknown")
    .bind(&req.device_public_key)
    .execute(&state.pool)
    .await
    .ok();

    Ok(Device {
        id,
        user_id: user_id.to_string(),
        name: req.device_name.clone(),
        platform: "unknown".to_string(),
        public_key: req.device_public_key.clone(),
        last_seen_at: Utc::now().to_rfc3339(),
        registered_at: Utc::now().to_rfc3339(),
    })
}
