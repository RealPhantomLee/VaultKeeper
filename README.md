# VaultKeeper

A local-first, encrypted knowledge management platform inspired by Obsidian.md. Your notes, your data, your server.

## Features

- **Local-first**: All notes stored as plain markdown files on your device
- **End-to-end encryption**: Optional client-side encryption before sync
- **Self-hosted sync**: Raspberry Pi acts as your personal sync server
- **Cross-platform**: Desktop (Tauri) and Mobile (React Native)
- **Offline-first**: Full functionality without internet connection
- **Backlinks & Graph**: Wiki-links, backlink detection, interactive graph view
- **Command palette**: Quick access to all features via keyboard
- **Dark/Light themes**: System-aware theme switching
- **Full-text search**: SQLite FTS5 powered instant search
- **Plugin-ready**: Extensible architecture for future plugins

## Architecture

```
+------------------+          +-------------------+          +------------------+
|  Desktop (Tauri) |          |  Raspberry Pi 5   |          |  Mobile (RN)     |
|  React + TS      |<-------->|  Sync Server      |<-------->|  Local Vault     |
|  Local Vault     |  HTTPS   |  SQLite + Docker  |  HTTPS   |                  |
+------------------+          +-------------------+          +------------------+
```

See [Architecture](docs/architecture.md) for detailed system design.

## Quick Start

### Desktop Development
```bash
# Install dependencies (pnpm 10+)
pnpm install

# Start development server
just dev-desktop          # or: pnpm --filter @vaultkeeper/desktop tauri:dev

# Build for production
pnpm --filter @vaultkeeper/desktop build
```

### Server Deployment
```bash
# Build and deploy to Raspberry Pi
docker compose -f deploy/compose/docker-compose.yml up -d
```

### Mobile Development
```bash
# Start Metro bundler
pnpm --filter @vaultkeeper/mobile start

# Run on Android
pnpm --filter @vaultkeeper/mobile android

# Run on iOS
pnpm --filter @vaultkeeper/mobile ios
```

## Project Structure

```
VaultKeeper/
├── packages/
│   ├── types/              # Shared TypeScript types
│   ├── crypto/             # Encryption (tweetnacl XChaCha20-Poly1305 + hash-wasm Argon2id + @noble/hashes HMAC)
│   ├── sync-protocol/      # Sync logic & conflict resolution
│   └── config/             # Shared constants
├── apps/
│   ├── desktop/            # Tauri desktop application
│   │   ├── src/            # React frontend
│   │   │   ├── components/ # UI components
│   │   │   ├── stores/     # Zustand state stores
│   │   │   ├── services/   # External services
│   │   │   ├── hooks/      # React hooks
│   │   │   └── utils/      # Utility functions
│   │   └── src-tauri/      # Rust backend
│   └── mobile/             # React Native application
│       └── src/
├── server/                 # Rust sync server (Axum)
│   └── src/
├── deploy/
│   ├── compose/            # Docker Compose configs
│   ├── scripts/            # Deployment & backup scripts
│   ├── systemd/            # Systemd service files
│   └── nginx/              # Nginx reverse proxy config
├── .github/workflows/      # CI/CD pipelines
└── docs/                   # Documentation
```

## Documentation

- [Architecture](docs/architecture.md) - System design and data flow
- [API Contracts](docs/api-contracts.md) - REST API documentation
- [Raspberry Pi Setup](docs/pi-setup.md) - Server deployment guide
- [Tailscale Setup](docs/tailscale-setup.md) - Secure remote access
- [Deployment Checklist](docs/deployment-checklist.md) - Production checklist
- [Roadmap](docs/roadmap.md) - Implementation phases and timeline

## Technology Stack

| Component | Technology |
|-----------|------------|
| Desktop | Tauri + React + TypeScript + Rust |
| Mobile | React Native + TypeScript |
| Server | Rust (Axum) + SQLite |
| Editor | TipTap + ProseMirror |
| Search | SQLite FTS5 |
| Graph | D3.js |
| Encryption | XChaCha20-Poly1305 via tweetnacl + Argon2id via hash-wasm + HMAC-SHA256 via @noble/hashes |
| State | Zustand |
| Styling | TailwindCSS |
| Testing | Vitest + Playwright |
| CI/CD | GitHub Actions |
| Deployment | Docker + Docker Compose |

## Security

- **Transport**: TLS via Nginx reverse proxy
- **Network**: Tailscale VPN (recommended)
- **Authentication**: JWT with Argon2id password hashing
- **Encryption**: Client-side XChaCha20-Poly1305 (optional E2EE)
- **Access**: Firewall (UFW), fail2ban, rate limiting
- **Storage**: Secure credential storage, encrypted vault option

## Development

### Prerequisites
- Node.js 22 (`.nvmrc`)
- pnpm 10+
- Rust 1.95 (`rust-toolchain.toml`)
- Docker + Docker Compose
- `just` (recipes in `justfile`) — optional but recommended
- Git

### Commands

This repo ships a `justfile`. Install [`just`](https://github.com/casey/just) and run:

```bash
just                 # list all recipes
just dev-server      # run the Rust sync server (auto-reloads if cargo-watch is installed)
just dev-desktop     # run the Tauri desktop app
just check-server    # cargo check
just build-server    # cargo build --release
just lint-server     # cargo clippy -- -D warnings
just typecheck       # pnpm -r typecheck across the workspace
just doctor          # versions + git/docker status
```

The pnpm scripts still work (`pnpm dev`, `pnpm build`, `pnpm typecheck`, etc.).

### Pre-commit hooks (lefthook)

`lefthook.yml` configures:
- `prettier --check` on staged TS/JS/JSON/MD/YAML
- `cargo fmt --check` on staged Rust
- `cargo check` when Rust files are touched
- a regex secret scan over the staged diff

Hooks are not auto-installed. After cloning, run once:

```bash
pnpm dlx lefthook install
# or with a global install:
lefthook install
```

The `pre-push` hook runs `pnpm -r typecheck` and `cargo clippy -D warnings`.

## License

[MIT](LICENSE)

## Related projects

- [Local-AI-Web-Workspace](https://github.com/RealPhantomLee/Local-AI-Web-Workspace) — local-first AI stack (Ollama + AnythingLLM + Homarr)
- [airpoint](https://github.com/RealPhantomLee/airpoint) — touchless cursor control via webcam (Python + MediaPipe)
- [CyberSec-Web-Services](https://github.com/RealPhantomLee/CyberSec-Web-Services) — production self-hosted business site
- [vulnerability-management-lab](https://github.com/RealPhantomLee/vulnerability-management-lab) — end-to-end VM lifecycle lab
- [azure-security-monitoring-lab](https://github.com/RealPhantomLee/azure-security-monitoring-lab) — Azure hardening + KQL detections

Full portfolio: [github.com/RealPhantomLee](https://github.com/RealPhantomLee)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
