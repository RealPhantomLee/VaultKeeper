mod db;
mod handlers;
mod middleware;
mod models;
mod routes;
mod sync;
mod ws;

use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "sqlite://data/vaultkeeper.db".to_string()
    });

    let pool = db::create_pool(&database_url).await?;
    db::run_migrations(&pool).await?;

    let app_state = Arc::new(AppState {
        pool,
        jwt_secret: std::env::var("JWT_SECRET").unwrap_or_else(|_| {
            "dev-secret-change-in-production".to_string()
        }),
        data_dir: std::env::var("DATA_DIR").unwrap_or_else(|_| "/opt/vaultkeeper/data".to_string()),
        backup_dir: std::env::var("BACKUP_DIR").unwrap_or_else(|_| {
            "/opt/vaultkeeper/backups".to_string()
        }),
    });

    let cors = CorsLayer::permissive();

    let app = routes::create_router(app_state)
        .layer(cors)
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

struct AppState {
    pool: sqlx::SqlitePool,
    jwt_secret: String,
    data_dir: String,
    backup_dir: String,
}
