use std::sync::Arc;

use axum::{
    async_trait,
    extract::{FromRequestParts, Request, State},
    http::{header::AUTHORIZATION, request::Parts, StatusCode},
    middleware::Next,
    response::Response,
};
use serde::{Deserialize, Serialize};

use crate::AppState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthClaims {
    pub user_id: String,
    pub device_id: String,
    pub exp: usize,
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthClaims
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<AuthClaims>()
            .cloned()
            .ok_or((
                StatusCode::UNAUTHORIZED,
                "Missing authentication".to_string(),
            ))
    }
}

pub async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    mut request: Request,
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
        &jsonwebtoken::DecodingKey::from_secret(state.jwt_secret.as_bytes()),
        &validation,
    )
    .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid token".to_string()))?;

    request.extensions_mut().insert(token_data.claims);
    Ok(next.run(request).await)
}
