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
# Install dependencies
npm install

# Start development server
npm run dev:desktop

# Build for production
npm run build:desktop
```

### Server Deployment
```bash
# Build and deploy to Raspberry Pi
docker compose -f deploy/compose/docker-compose.yml up -d
```

### Mobile Development
```bash
# Start Metro bundler
npm run dev:mobile

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Project Structure

```
VaultKeeper/
├── packages/
│   ├── types/              # Shared TypeScript types
│   ├── crypto/             # Encryption (libsodium/XChaCha20)
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
| Encryption | XChaCha20-Poly1305 (libsodium) |
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
- Node.js 20+
- Rust 1.80+
- Docker + Docker Compose
- Git

### Commands
```bash
npm run dev          # Start all development servers
npm run build        # Build all packages and apps
npm run test         # Run all tests
npm run lint         # Lint all code
npm run typecheck    # TypeScript type checking
npm run format       # Format code with Prettier
npm run docker:build # Build Docker images
npm run docker:up    # Start Docker services
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
