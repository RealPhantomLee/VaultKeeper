use std::sync::Arc;
use axum::{
    routing::{get, post, put, delete},
    Router,
};
use crate::AppState;
use crate::handlers;

pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(handlers::health_check))
        .route("/api/v1/auth/register", post(handlers::register))
        .route("/api/v1/auth/login", post(handlers::login))
        .route("/api/v1/auth/device", post(handlers::register_device))
        .route("/api/v1/sync", post(handlers::sync))
        .route("/api/v1/sync/status", get(handlers::sync_status))
        .route("/api/v1/sync/conflicts", get(handlers::get_conflicts))
        .route(
            "/api/v1/sync/conflicts/:id/resolve",
            post(handlers::resolve_conflict),
        )
        .route("/api/v1/vaults", get(handlers::list_vaults))
        .route("/api/v1/vaults", post(handlers::create_vault))
        .route("/api/v1/vaults/:id", get(handlers::get_vault))
        .route("/api/v1/backups", get(handlers::list_backups))
        .route("/api/v1/backups", post(handlers::create_backup))
        .route("/api/v1/devices", get(handlers::list_devices))
        .route("/ws/sync", get(handlers::ws_sync))
        .with_state(state)
}
