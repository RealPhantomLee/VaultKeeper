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
RUN cargo build --release --bin vaultkeeper-server

FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r vaultkeeper && useradd -r -g vaultkeeper -d /app -s /sbin/nologin vaultkeeper

COPY --from=builder /app/target/release/vaultkeeper-server /usr/local/bin/vaultkeeper-server

RUN mkdir -p /opt/vaultkeeper/data /opt/vaultkeeper/backups && \
    chown -R vaultkeeper:vaultkeeper /opt/vaultkeeper

USER vaultkeeper

ENV DATA_DIR=/opt/vaultkeeper/data
ENV BACKUP_DIR=/opt/vaultkeeper/backups
ENV PORT=3456
ENV DATABASE_URL=sqlite:///opt/vaultkeeper/data/vaultkeeper.db

EXPOSE 3456

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3456/health || exit 1

ENTRYPOINT ["vaultkeeper-server"]
