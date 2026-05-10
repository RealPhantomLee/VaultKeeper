set shell := ["bash", "-cu"]
set dotenv-load := true

# Default — show available recipes
default:
    @just --list

# --- Server (Rust) ---

# Run the server in dev mode (auto-reloads if cargo-watch is installed)
dev-server:
    @command -v cargo-watch >/dev/null && cd server && cargo watch -x run \
        || (cd server && cargo run)

# Cargo check the server
check-server:
    cd server && cargo check --bin vaultkeeper-server

# Build server release binary
build-server:
    cd server && cargo build --release --bin vaultkeeper-server

# Lint the server
lint-server:
    cd server && cargo clippy -- -D warnings

# Format Rust code
fmt-server:
    cd server && cargo fmt

# Test the server
test-server:
    cd server && cargo test

# --- Workspace (TS) ---

# Install workspace deps
install:
    pnpm install

# Typecheck the entire TS workspace
typecheck:
    pnpm -r typecheck

# Lint the workspace
lint:
    pnpm -r lint

# Run all tests
test:
    pnpm -r test

# Build all packages
build:
    pnpm -r build

# --- Apps ---

# Desktop dev (Vite + Tauri)
dev-desktop:
    pnpm --filter @vaultkeeper/desktop tauri:dev

# Mobile dev (Metro)
dev-mobile:
    pnpm --filter @vaultkeeper/mobile start

# --- Docker / deploy ---

# Build the docker image (no push)
build-docker:
    docker compose -f deploy/compose/docker-compose.yml build

# Start the stack locally
up:
    docker compose -f deploy/compose/docker-compose.yml up -d

# Stop the stack
down:
    docker compose -f deploy/compose/docker-compose.yml down

# Tail server logs
logs:
    docker compose -f deploy/compose/docker-compose.yml logs -f sync-server

# Stack status
status:
    docker compose -f deploy/compose/docker-compose.yml ps

# --- Backups ---

# Trigger a backup (must be run on the Pi)
backup:
    deploy/scripts/backup.sh

# Restore from a backup tarball
restore TARBALL:
    deploy/scripts/restore.sh {{TARBALL}}

# --- Diagnostics ---

# Print versions and stack status — first stop when something's off
doctor:
    @echo "=== versions ==="
    @rustc --version 2>/dev/null || echo "rust: missing"
    @cargo --version 2>/dev/null || echo "cargo: missing"
    @node --version  2>/dev/null || echo "node: missing"
    @pnpm --version  2>/dev/null || echo "pnpm: missing"
    @docker --version 2>/dev/null || echo "docker: missing"
    @echo ""
    @echo "=== git ==="
    @git rev-parse --abbrev-ref HEAD 2>/dev/null || true
    @git status --short 2>/dev/null | head -10
    @echo ""
    @echo "=== docker stack ==="
    @docker compose -f deploy/compose/docker-compose.yml ps 2>/dev/null || echo "(docker not available)"

# Clean all build artifacts
clean:
    cd server && cargo clean
    pnpm -r clean
    rm -rf node_modules .turbo
