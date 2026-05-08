# VaultKeeper Architecture

## System Overview

VaultKeeper is a local-first, encrypted knowledge management platform inspired by Obsidian.md. It uses a Raspberry Pi as a self-hosted sync server while keeping all data under user control.

```
+------------------+          +-------------------+          +------------------+
|  Desktop (Tauri) |          |  Raspberry Pi 5   |          |  Mobile (React   |
|  React + TS      |<-------->|  Sync Server      |<-------->|  Native)         |
|  Local Vault     |  HTTPS   |  SQLite + Docker  |  HTTPS   |  Local Vault     |
+------------------+          +-------------------+          +------------------+
       |                              |                              |
       |  Markdown Files              |  Encrypted Sync              |  Markdown Files
       |  SQLite Index                |  Conflict Resolution         |  AsyncStorage
       |  TipTap Editor               |  Backup Management           |  WebView Editor
       v                              v                              v
```

## Component Architecture

### 1. Desktop Application (Tauri + React)
- **Tauri Rust backend**: Filesystem access, native dialogs, secure IPC
- **React frontend**: UI rendering, state management, editor
- **TipTap editor**: Rich markdown editing with WYSIWYG
- **SQLite FTS5**: Full-text search indexing
- **File watcher**: Real-time vault change detection

### 2. Sync Server (Rust + Axum)
- **REST API**: CRUD operations for vaults, sync, devices
- **WebSocket**: Real-time sync notifications
- **SQLite database**: Sync metadata, conflict tracking
- **Encryption support**: Server never sees plaintext when E2EE enabled

### 3. Mobile Application (React Native)
- **Native UI**: Optimized for touch and mobile
- **Local storage**: AsyncStorage + react-native-fs
- **Sync engine**: Background sync with retry queue
- **Markdown display**: react-native-markdown-display

### 4. Shared Packages
- `@vaultkeeper/types`: TypeScript type definitions
- `@vaultkeeper/crypto`: Encryption/decryption with libsodium
- `@vaultkeeper/sync-protocol`: Sync logic and conflict resolution
- `@vaultkeeper/config`: Shared constants and configuration

## Data Flow

### Local Editing (Offline)
```
User Edit -> TipTap -> Zustand Store -> Debounced Save -> Markdown File -> SQLite Index
```

### Sync Flow (E2EE Disabled)
```
Local Change -> Sync Queue -> HTTP POST /sync -> Server Stores -> Other Devices Pull
```

### Sync Flow (E2EE Enabled)
```
Local Change -> Encrypt -> Sync Queue -> HTTP POST /sync -> Server Stores Ciphertext -> Other Devices Decrypt
```

### Conflict Resolution Flow
```
Device A: edit note -> sync -> server detects hash mismatch
Device B: edit same note -> sync -> server creates conflict record
Server: returns conflict to both devices
User: chooses resolution (local/remote/merged)
Server: applies resolution, updates sync version
```

## Database Schema

### Server (SQLite)
```
users          - User accounts and credentials
devices        - Registered devices per user
vaults         - Vault metadata and sync version
sync_operations - All sync operations with versioning
sync_conflicts  - Conflict records with resolution status
sync_logs       - Audit log for all sync events
backups         - Backup metadata and status
```

### Client (SQLite for indexing)
```
notes_index    - Full-text search index
links_index    - Wiki-link relationships
tags_index     - Tag relationships
sync_state     - Local sync state and queue
```

## Encryption Architecture

### Key Derivation
```
User Password -> Argon2id -> 64 bytes
  -> 32 bytes encryption key (XChaCha20-Poly1305)
  -> 32 bytes MAC key
```

### Data Encryption
```
Plaintext -> XChaCha20-Poly1305 -> {ciphertext, nonce, salt}
```

### Server Blindness
- Server stores only encrypted payloads
- Server cannot decrypt without client keys
- Sync metadata (hashes, timestamps) remains visible
- Conflict resolution works on encrypted hashes

## Security Layers

1. **Transport**: TLS via Nginx reverse proxy
2. **Network**: Tailscale/WireGuard VPN
3. **Authentication**: JWT with 30-day expiry
4. **Authorization**: Per-user, per-vault scoping
5. **Encryption**: Client-side E2EE (optional)
6. **Access**: Firewall rules, fail2ban, rate limiting

## Performance Optimizations

### Desktop
- Incremental indexing (only changed files)
- Virtualized file tree for large vaults
- Lazy graph rendering with D3 force simulation
- Debounced auto-save (500ms)
- SQLite FTS5 for instant search

### Server
- Connection pooling (SQLite)
- Response compression
- ARM64 native builds
- Resource limits (512MB max memory)
- Docker health checks

### Mobile
- FlatList virtualization
- Async storage caching
- Background sync throttling
- Image lazy loading

## Deployment Architecture

```
+------------------------------------------+
|           Raspberry Pi 5                  |
|  +--------+  +--------+  +-------------+ |
|  | Nginx  |  | Sync   |  |  Tailscale  | |
|  | :8080  |->| Server |  |  (optional) | |
|  | :8443  |  | :3456  |  |             | |
|  +--------+  +--------+  +-------------+ |
|       |           |                      |
|  +----+-----------+--------------------+ |
|  |         Docker Compose             | |
|  |  volumes: data, backups, logs      | |
|  +------------------------------------+ |
+------------------------------------------+
```

## File Structure

```
VaultKeeper/
├── packages/
│   ├── types/           # Shared TypeScript types
│   ├── crypto/          # Encryption library
│   ├── sync-protocol/   # Sync logic
│   ├── config/          # Shared constants
│   ├── tsconfig/        # Base TypeScript config
│   └── eslint-config/   # Shared ESLint config
├── apps/
│   ├── desktop/         # Tauri desktop app
│   │   ├── src/         # React frontend
│   │   └── src-tauri/   # Rust backend
│   └── mobile/          # React Native app
│       └── src/
├── server/              # Rust sync server
│   └── src/
├── deploy/
│   ├── compose/         # Docker Compose configs
│   ├── scripts/         # Deployment scripts
│   ├── systemd/         # Systemd service files
│   └── nginx/           # Nginx configurations
├── .github/
│   └── workflows/       # CI/CD pipelines
└── docs/                # Documentation
```
