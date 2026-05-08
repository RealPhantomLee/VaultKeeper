use axum::{
    extract::Request,
    http::{header::AUTHORIZATION, StatusCode},
    middleware::Next,
    response::Response,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthClaims {
    pub user_id: String,
    pub device_id: String,
    pub exp: usize,
}

pub async fn auth_middleware(
    request: Request,
    next: Next,
) -> Result<Response, (StatusCode, String)> {
    let token = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .ok_or((StatusCode::UNAUTHORIZED, "Missing token".to_string()))?;

    let validation = jsonwebtoken::Validation::default();
    let token_data = jsonwebtoken::decode::<AuthClaims>(
        token,
        &jsonwebtoken::DecodingKey::from_secret(b"dev-secret-change-in-production"),
        &validation,
    )
    .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid token".to_string()))?;

    let request = request
        .with_extensions(|extensions| {
            extensions.insert(token_data.claims);
        });

    Ok(next.run(request).await)
}
