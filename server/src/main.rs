mod db;
mod handlers;
mod middleware;
mod models;
mod routes;
mod sync;
mod ws;

use std::net::SocketAddr;
use std::sync::Arc;

use axum::http::{header, HeaderName, HeaderValue, Method};
use tower_http::cors::CorsLayer;
use tower_http::request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

const X_REQUEST_ID: HeaderName = HeaderName::from_static("x-request-id");

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite://data/vaultkeeper.db".to_string());

    let pool = db::create_pool(&database_url).await?;
    db::run_migrations(&pool).await?;

    let app_state = Arc::new(AppState {
        pool,
        jwt_secret: std::env::var("JWT_SECRET")
            .unwrap_or_else(|_| "change-me-in-production".to_string()),
        data_dir: std::env::var("DATA_DIR").unwrap_or_else(|_| "/opt/vaultkeeper/data".to_string()),
        backup_dir: std::env::var("BACKUP_DIR")
            .unwrap_or_else(|_| "/opt/vaultkeeper/backups".to_string()),
    });

    let cors = build_cors_layer();

    let app = routes::create_router(app_state)
        .layer(cors)
        .layer(SetRequestIdLayer::new(X_REQUEST_ID.clone(), MakeRequestUuid))
        .layer(PropagateRequestIdLayer::new(X_REQUEST_ID.clone()))
        .layer(TraceLayer::new_for_http());

    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "3456".to_string())
        .parse()
        .unwrap_or(3456);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("VaultKeeper sync server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

fn build_cors_layer() -> CorsLayer {
    let env = std::env::var("RUST_ENV").unwrap_or_default();
    let is_dev = matches!(env.as_str(), "development" | "dev");

    if is_dev {
        tracing::warn!("CORS: permissive (RUST_ENV=development)");
        return CorsLayer::permissive();
    }

    let origins_raw = std::env::var("CORS_ALLOWED_ORIGINS").unwrap_or_default();
    let origins: Vec<HeaderValue> = origins_raw
        .split(',')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .filter_map(|s| s.parse::<HeaderValue>().ok())
        .collect();

    if origins.is_empty() {
        tracing::warn!(
            "CORS: no origins configured (set CORS_ALLOWED_ORIGINS or RUST_ENV=development)"
        );
        return CorsLayer::new();
    }

    tracing::info!("CORS: allowed origins = {:?}", origins);
    CorsLayer::new()
        .allow_origin(origins)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE, X_REQUEST_ID])
}

pub struct AppState {
    pub pool: sqlx::SqlitePool,
    pub jwt_secret: String,
    #[allow(dead_code)]
    pub data_dir: String,
    #[allow(dead_code)]
    pub backup_dir: String,
}
