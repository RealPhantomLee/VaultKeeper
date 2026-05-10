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

    Router::new()
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
        )
        .merge(protected_routes(state.clone()))
        .with_state(state)
}

fn protected_routes(state: Arc<AppState>) -> Router<Arc<AppState>> {
    Router::new()
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
        .layer(middleware::from_fn_with_state(state, auth_middleware))
}

// Same router, minus the per-IP rate limiter. Used by integration tests, which
// run on an in-process mock transport that doesn't populate ConnectInfo and so
// trips tower_governor's PeerIp extractor.
#[cfg(test)]
fn test_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(handlers::health_check))
        .route("/api/v1/auth/register", post(handlers::register))
        .route("/api/v1/auth/login", post(handlers::login))
        .merge(protected_routes(state.clone()))
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{db, AppState};
    use axum_test::TestServer;
    use serde_json::{json, Value};
    use sqlx::sqlite::SqlitePoolOptions;

    async fn test_app() -> (TestServer, Arc<AppState>) {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("connect in-memory sqlite");

        sqlx::query("PRAGMA foreign_keys=ON")
            .execute(&pool)
            .await
            .ok();

        db::run_migrations(&pool).await.expect("run migrations");

        let state = Arc::new(AppState {
            pool,
            jwt_secret: "test-secret-do-not-use".to_string(),
            data_dir: "/tmp/vk-test-data".to_string(),
            backup_dir: "/tmp/vk-test-backup".to_string(),
        });

        let app = test_router(state.clone());
        let server = TestServer::new(app).expect("test server");
        (server, state)
    }

    async fn register_and_login(server: &TestServer, username: &str, device_id: &str) -> String {
        let resp = server
            .post("/api/v1/auth/register")
            .json(&json!({
                "username": username,
                "password": "hunter2-correct-horse",
            }))
            .await;
        assert_eq!(
            resp.status_code(),
            200,
            "register failed: {}",
            resp.text()
        );

        let resp = server
            .post("/api/v1/auth/login")
            .json(&json!({
                "username": username,
                "password": "hunter2-correct-horse",
                "device_id": device_id,
                "device_name": format!("dev-{}", device_id),
                "device_public_key": "pk",
            }))
            .await;
        assert_eq!(resp.status_code(), 200, "login failed: {}", resp.text());

        resp.json::<Value>()["token"]
            .as_str()
            .expect("token in login response")
            .to_string()
    }

    #[tokio::test]
    async fn register_and_login_succeeds() {
        let (server, _) = test_app().await;
        let token = register_and_login(&server, "alice", "device-1").await;
        assert!(!token.is_empty());
    }

    #[tokio::test]
    async fn duplicate_username_rejected() {
        let (server, _) = test_app().await;
        register_and_login(&server, "bob", "device-1").await;
        let resp = server
            .post("/api/v1/auth/register")
            .json(&json!({
                "username": "bob",
                "password": "hunter2-correct-horse",
            }))
            .await;
        assert_eq!(resp.status_code(), 409);
    }

    #[tokio::test]
    async fn login_with_wrong_password_rejected() {
        let (server, _) = test_app().await;
        register_and_login(&server, "carol", "device-1").await;
        let resp = server
            .post("/api/v1/auth/login")
            .json(&json!({
                "username": "carol",
                "password": "wrong",
                "device_id": "device-1",
                "device_name": "dev-device-1",
                "device_public_key": "pk",
            }))
            .await;
        assert_eq!(resp.status_code(), 401);
    }

    #[tokio::test]
    async fn missing_token_rejected() {
        let (server, _) = test_app().await;
        let resp = server.get("/api/v1/vaults").await;
        assert_eq!(resp.status_code(), 401);
    }

    #[tokio::test]
    async fn tampered_token_rejected() {
        let (server, _) = test_app().await;
        let mut token = register_and_login(&server, "dave", "device-1").await;
        token.push('x');
        let resp = server
            .get("/api/v1/vaults")
            .authorization_bearer(&token)
            .await;
        assert_eq!(resp.status_code(), 401);
    }

    #[tokio::test]
    async fn expired_token_rejected() {
        // Pin the JWT exp policy: tokens past their exp (beyond the 60s leeway) are rejected.
        let (server, state) = test_app().await;

        let claims = crate::middleware::AuthClaims {
            user_id: "u".to_string(),
            device_id: "d".to_string(),
            exp: (chrono::Utc::now().timestamp() - 3600) as usize,
        };
        let token = jsonwebtoken::encode(
            &jsonwebtoken::Header::default(),
            &claims,
            &jsonwebtoken::EncodingKey::from_secret(state.jwt_secret.as_bytes()),
        )
        .unwrap();

        let resp = server
            .get("/api/v1/vaults")
            .authorization_bearer(&token)
            .await;
        assert_eq!(resp.status_code(), 401);
    }

    #[tokio::test]
    async fn sync_rejects_device_id_mismatch() {
        // Pins the device-id replay defense: a valid token's claims.device_id
        // must match the request body's device_id, or /sync returns 403.
        let (server, _) = test_app().await;
        let token = register_and_login(&server, "frank", "device-A").await;

        let resp = server
            .post("/api/v1/vaults")
            .authorization_bearer(&token)
            .json(&json!({"name": "primary"}))
            .await;
        assert_eq!(resp.status_code(), 200);
        let vault_id = resp.json::<Value>()["data"]["id"]
            .as_str()
            .unwrap()
            .to_string();

        let resp = server
            .post("/api/v1/sync")
            .authorization_bearer(&token)
            .json(&json!({
                "device_id": "device-IMPOSTER",
                "vault_id": vault_id,
                "last_sync_version": 0,
                "operations": [],
                "client_version": 1,
            }))
            .await;
        assert_eq!(resp.status_code(), 403);
        // Handlers serialize ApiError directly on error responses.
        let body: Value = resp.json();
        assert_eq!(body["code"], "DEVICE_MISMATCH");
    }

    #[tokio::test]
    async fn sync_rejects_other_users_vault() {
        // Pins vault ownership: user A's token cannot /sync against user B's vault.
        let (server, _) = test_app().await;

        let token1 = register_and_login(&server, "g1", "device-1").await;
        let resp = server
            .post("/api/v1/vaults")
            .authorization_bearer(&token1)
            .json(&json!({"name": "primary"}))
            .await;
        let vault_id = resp.json::<Value>()["data"]["id"]
            .as_str()
            .unwrap()
            .to_string();

        let token2 = register_and_login(&server, "g2", "device-2").await;

        let resp = server
            .post("/api/v1/sync")
            .authorization_bearer(&token2)
            .json(&json!({
                "device_id": "device-2",
                "vault_id": vault_id,
                "last_sync_version": 0,
                "operations": [],
                "client_version": 1,
            }))
            .await;
        assert_eq!(resp.status_code(), 403);
    }
}
