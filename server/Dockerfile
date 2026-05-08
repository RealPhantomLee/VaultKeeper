FROM lukemathwalker/cargo-chef:latest-rust-1-bookworm AS chef
WORKDIR /app

FROM chef AS planner
COPY server/Cargo.toml server/Cargo.lock ./
COPY server/src ./src
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY server/Cargo.toml server/Cargo.lock ./
COPY server/src ./src
RUN cargo build --release --bin ghosttrack-server

FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r ghosttrack && useradd -r -g ghosttrack -d /app -s /sbin/nologin ghosttrack

COPY --from=builder /app/target/release/ghosttrack-server /usr/local/bin/ghosttrack-server

RUN mkdir -p /opt/ghosttrack/data /opt/ghosttrack/backups && \
    chown -R ghosttrack:ghosttrack /opt/ghosttrack

USER ghosttrack

ENV DATA_DIR=/opt/ghosttrack/data
ENV BACKUP_DIR=/opt/ghosttrack/backups
ENV PORT=3456
ENV DATABASE_URL=sqlite:///opt/ghosttrack/data/ghosttrack.db

EXPOSE 3456

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3456/health || exit 1

ENTRYPOINT ["ghosttrack-server"]
