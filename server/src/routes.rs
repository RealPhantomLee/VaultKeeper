use std::sync::Arc;

use axum::{
    middleware,
    routing::{get, post},
    Router,
};
use tower_governor::{governor::GovernorConfigBuilder, GovernorLayer};

use crate::handlers;
use crate::middleware::auth_middleware;
use crate::AppState;

pub fn create_router(state: Arc<AppState>) -> Router {
    // Rate limit login: 5 per minute per IP (1 token every 12s, burst of 5).
    let login_governor = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(12)
            .burst_size(5)
            .finish()
            .expect("login governor config"),
    );

    // Rate limit register: 3 per minute per IP (1 token every 20s, burst of 3).
    let register_governor = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(20)
            .burst_size(3)
            .finish()
            .expect("register governor config"),
    );

    let public = Router::new()
        .route("/health", get(handlers::health_check))
        .route(
            "/api/v1/auth/register",
            post(handlers::register).layer(GovernorLayer {
                config: register_governor,
            }),
        )
        .route(
            "/api/v1/auth/login",
            post(handlers::login).layer(GovernorLayer {
                config: login_governor,
            }),
        );

    let protected = Router::new()
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
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    public.merge(protected).with_state(state)
}
