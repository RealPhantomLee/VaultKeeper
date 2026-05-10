// Some structs are scaffolding for handlers/sync that aren't fully wired up yet.
// They're complete data shapes that consumers in other crates will rely on, so
// keep them rather than letting clippy strip them.
#![allow(dead_code)]

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: String,
    pub username: String,
    pub password_hash: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Device {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub platform: String,
    pub public_key: String,
    pub last_seen_at: String,
    pub registered_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Vault {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub sync_version: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncOperation {
    pub id: String,
    pub vault_id: String,
    pub device_id: String,
    pub operation_type: String,
    pub path: String,
    pub content_hash: String,
    pub content: Option<Vec<u8>>,
    pub version: i64,
    pub status: String,
    pub created_at: String,
    pub synced_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncConflict {
    pub id: String,
    pub vault_id: String,
    pub path: String,
    pub local_device_id: String,
    pub remote_device_id: String,
    pub local_hash: String,
    pub remote_hash: String,
    pub local_content: Option<Vec<u8>>,
    pub remote_content: Option<Vec<u8>>,
    pub resolved: bool,
    pub resolution: Option<String>,
    pub created_at: String,
    pub resolved_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Backup {
    pub id: String,
    pub vault_id: String,
    pub path: String,
    pub size: i64,
    pub compressed: bool,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct AuthRequest {
    pub username: String,
    pub password: String,
    pub device_id: String,
    pub device_name: String,
    pub device_public_key: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub device_id: String,
    pub expires_at: String,
    pub sync_version: i64,
}

#[derive(Debug, Deserialize)]
pub struct SyncRequest {
    pub device_id: String,
    pub vault_id: String,
    pub last_sync_version: i64,
    pub operations: Vec<SyncOperationRequest>,
    pub client_version: i32,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncOperationRequest {
    pub id: String,
    pub r#type: String,
    pub path: String,
    pub content: Option<String>,
    pub hash: String,
    pub timestamp: String,
    pub device_id: String,
}

#[derive(Debug, Serialize)]
pub struct SyncResponse {
    pub success: bool,
    pub new_sync_version: i64,
    pub operations: Vec<SyncOperationResponse>,
    pub conflicts: Vec<SyncConflictResponse>,
    pub server_time: String,
}

#[derive(Debug, Serialize)]
pub struct SyncOperationResponse {
    pub id: String,
    pub r#type: String,
    pub path: String,
    pub content: Option<String>,
    pub hash: String,
    pub version: i64,
}

#[derive(Debug, Serialize)]
pub struct SyncConflictResponse {
    pub id: String,
    pub path: String,
    pub local_hash: String,
    pub remote_hash: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<ApiError>,
    pub timestamp: String,
}

#[derive(Debug, Serialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct HealthCheckResponse {
    pub status: String,
    pub version: String,
    pub uptime: u64,
}
