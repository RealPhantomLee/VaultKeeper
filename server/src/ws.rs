use axum::extract::ws::{Message, WebSocket};
use futures::{SinkExt, StreamExt};

pub async fn handle_ws_connection(ws: WebSocket) {
    let (mut sender, mut receiver) = ws.split();

    tokio::spawn(async move {
        while let Some(Ok(message)) = receiver.next().await {
            match message {
                Message::Text(text) => {
                    tracing::debug!("Received ws message: {}", text);
                    if let Err(e) = sender.send(Message::Text(r#"{"type":"pong"}"#.into())).await {
                        tracing::error!("Failed to send ws message: {}", e);
                        break;
                    }
                }
                Message::Close(_) => {
                    tracing::info!("WebSocket connection closed");
                    break;
                }
                _ => {}
            }
        }
    });
}
