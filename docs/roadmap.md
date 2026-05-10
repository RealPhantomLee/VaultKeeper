# Implementation Roadmap

## Phase 1: Foundation (Weeks 1-4)
**Goal: Working desktop app with local vault**

### Week 1: Monorepo Setup
- [x] Initialize Turborepo monorepo
- [x] Configure TypeScript, ESLint, Prettier
- [x] Create shared packages (types, crypto, config)
- [x] Set up GitHub repository and CI workflow

### Week 2: Desktop App Shell
- [x] Tauri app initialization
- [x] React UI scaffolding
- [x] Zustand state management
- [x] Theme system (light/dark)
- [x] Basic layout (sidebars, editor area)

### Week 3: Vault & Editor
- [x] Filesystem abstraction layer
- [x] Markdown file reading/writing
- [x] TipTap editor integration
- [x] Auto-save with debouncing
- [x] Tab management (open, close, switch)

### Week 4: Indexing & Search
- [x] SQLite FTS5 integration
- [x] Incremental file watcher
- [x] Full-text search UI
- [x] File tree component
- [x] Basic note creation/deletion

**Deliverable:** Desktop app that can create, edit, and search markdown notes locally.

---

## Phase 2: Knowledge Features (Weeks 5-8)
**Goal: Obsidian-like knowledge management**

### Week 5: Backlinks & Links
- [x] Wiki-link parsing (`[[link]]`)
- [x] Backlink detection and display
- [x] Outgoing links panel
- [x] Link autocomplete in editor
- [x] Tag parsing and display

### Week 6: Graph View
- [x] D3.js force graph implementation
- [x] Node/edge generation from links
- [x] Interactive graph (pan, zoom, click)
- [x] Graph settings (depth, filters)
- [x] Performance optimization for large vaults

### Week 7: Command Palette & Navigation
- [x] Command palette UI (Ctrl+P)
- [x] Keyboard shortcut system
- [x] Quick note switching
- [x] Command registration API
- [x] Recent files list

### Week 8: Polish & Settings
- [x] Settings panel
- [x] Editor preferences (font, size, theme)
- [x] Export functionality
- [x] Drag-and-drop file organization
- [x] Accessibility improvements (ARIA, keyboard nav)

**Deliverable:** Feature-rich desktop app with backlinks, graph view, and command palette.

---

## Phase 3: Sync Server (Weeks 9-12)
**Goal: Raspberry Pi sync server with encryption**

### Week 9: Server Foundation
- [x] Rust Axum server setup
- [x] SQLite database with migrations
- [x] Docker containerization
- [x] Health check endpoints
- [x] Basic REST API structure

### Week 10: Authentication & Encryption
- [x] User registration and login
- [x] JWT authentication
- [x] Password hashing (Argon2id)
- [x] Client-side encryption layer
- [x] Encrypted sync payload format

### Week 11: Sync Protocol
- [x] Sync operation API
- [x] Version tracking
- [x] Incremental sync logic
- [x] Sync queue management
- [x] Diff-based synchronization

### Week 12: Conflict Resolution & WebSocket
- [x] Conflict detection
- [x] Manual merge UI
- [x] WebSocket real-time notifications
- [x] Sync status panel
- [x] Retry queue for failed operations

**Deliverable:** Working sync server with encrypted sync, conflict resolution, and real-time updates.

---

## Phase 4: Mobile & Advanced (Weeks 13-16)
**Goal: Mobile apps and backup/versioning**

### Week 13: Mobile Foundation
- [x] React Native app setup
- [x] Navigation structure
- [x] Note list and editor screens
- [x] Local storage integration
- [x] Theme system

### Week 14: Mobile Sync
- [x] Sync engine integration
- [x] Background sync queue
- [x] Offline editing support
- [x] Conflict notification UI
- [x] Sync status indicator

### Week 15: Backup & Versioning
- [x] Vault snapshot creation
- [x] Backup rotation
- [x] Version history UI
- [x] Restore from backup
- [x] Automated backup scripts

### Week 16: Production Readiness
- [x] Error handling improvements
- [x] Performance optimization
- [x] Raspberry Pi deployment script
- [x] Nginx reverse proxy
- [x] Tailscale integration guide

**Deliverable:** Mobile apps, backup system, and production-ready deployment.

---

## Phase 4.5: Path to Launch (Weeks 17-18)
**Goal: Get the already-built code actually deployed, verified, and tagged**

### CI & repo hygiene
- [ ] Update `.github/workflows/ci.yml`: Node 22, Rust 1.95, pnpm 10 (currently pinned to 20/1.80/npm — last 2 runs failed)
- [ ] Swap `npm ci` / `npm run *` for `pnpm install --frozen-lockfile` / `pnpm -r *` across every job
- [ ] Wire `pnpm/action-setup@v4` into `build-desktop`; remove or implement the disabled `e2e` job (`if: false`)
- [ ] Push the 2 local commits (`91e7dfa`, `8aedad5`) to `origin/main` once CI is green
- [ ] Add `SECURITY.md`, `CONTRIBUTING.md`, build/test badges to README
- [ ] Document and (optionally) automate `lefthook install` in CONTRIBUTING

### Server & sync follow-ups (carried from `.claude/HANDOFF.md`)
- [ ] Decide Yjs vs hand-rolled sync; remove or replace the broken `mergeContent` in `packages/sync-protocol`
- [ ] CORS by env (`CORS_ALLOWED_ORIGINS`); permissive only when `RUST_ENV=development`
- [ ] Wire `tower-http` `request-id` + `util` layers (deps added, no layer configured)
- [ ] Explicit JWT exp validation + 60s leeway
- [ ] Webhook deploy to replace polling auto-update (architectural)
- [ ] litestream for SQLite continuous replication on the Pi

### Test coverage (currently zero — every package uses `--passWithNoTests`)
- [ ] `packages/crypto`: encrypt/decrypt round-trip, HMAC verify, Argon2id KDF
- [ ] `server`: auth handler tests, device_id replay-protection check, vault ownership checks on all `/vault/*` and `/backup/*` routes
- [ ] One Tauri smoke test for note create → edit → save → reload

### Pi deployment
- [ ] Provision Pi 5: SSH-keys-only, UFW, fail2ban, Tailscale joined
- [ ] Generate 64-char JWT secret on the Pi; populate `/opt/vaultkeeper/.env` (never commit)
- [ ] Add GitHub repo secrets: `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `PI_HOST`, `PI_USER`, `PI_SSH_KEY`, `PI_PORT`
- [ ] First deploy via `.github/workflows/deploy.yml`; verify `/health` on `:8080` and sync on `:3456`
- [ ] Wire Nginx TLS or Tailscale Serve at `https://cyberdeck.local:8443`
- [ ] Validate end-to-end sync: register device on desktop → create note → sync → open on mobile → edit → sync back → force a conflict
- [ ] Backup cron + tested restore drill via `deploy/scripts/restore.sh`
- [ ] Tag `v0.1.0`; build Tauri bundles via release workflow; attach to GitHub release

**Deliverable:** VaultKeeper running on the Pi, syncing desktop ↔ mobile, public `v0.1.0` release.

---

## Phase 5: Extensions (Weeks 19-22)
**Goal: Graph upgrades, plugins, AI, and collaboration**

### Week 19: Graph Upgrades
The current `GraphPanel.tsx` is a basic global D3 force graph. Upgrade to make it useful at scale.
- [ ] Local graph view: only neighbors of the active note, with depth slider (1–3 hops)
- [ ] Node size scaled by backlink count; color by tag or folder
- [ ] Filters: folder, tag, date range, orphans-only
- [ ] Wire the "graph settings" props the roadmap claimed in Week 6 (depth, filters) — they were never actually implemented
- [ ] Cluster / community detection coloring (optional, force-atlas-style)
- [ ] Suggested-edges overlay (dashed, distinct color) — populated by Week 21 similarity index

### Week 20: Plugin System
- [ ] Plugin architecture design
- [ ] Plugin manifest format
- [ ] Plugin sandboxing
- [ ] Plugin marketplace UI
- [ ] Built-in plugins (templates, calendar)

### Week 21: AI & Smart Auto-Linking (Local)
All inference local-only via Ollama on the host (already running for `Local-AI-Web-Workspace`) or an in-process ONNX model. Embeddings stay client-side; the sync server only ever sees encrypted payloads.
- [ ] Embedding pipeline: call Ollama `/api/embeddings` (e.g. `nomic-embed-text`) on note save, debounced
- [ ] Local vector index: `note_embeddings` table in SQLite via `sqlite-vec`, or brute-force cosine for vaults <10k notes
- [ ] "Related notes" sidebar panel: top-K nearest neighbors for the active note
- [ ] Suggested-edges in `GraphPanel` (dashed) sourced from the similarity index
- [ ] Inline auto-link suggestions in TipTap: idle scanner offers `[[X]]` for paragraphs that strongly match an existing note
- [ ] LLM auto-tagging on save (configurable model, opt-in per vault)
- [ ] LLM note summary: top-of-note one-liner + on-demand long-form
- [ ] Natural-language vault search: RAG over the embedding index with citations to source notes
- [ ] Daily / weekly digest auto-generated from recent notes

### Week 22: Collaboration
- [ ] Multi-user vault support (depends on Yjs decision in Phase 4.5)
- [ ] Real-time collaborative editing via Yjs + WebSocket presence
- [ ] Permission system
- [ ] Activity feed
- [ ] Share links

**Deliverable:** Plugin-extensible app with local AI, smart auto-linking, and real-time collaboration.

---

## Phase 6: Adoption & Wow Factor (Weeks 23-27)
**Goal: Make VaultKeeper the app people switch to from Obsidian — capture, reach, and trust**

### Week 23: Editor Speed
- [ ] Slash command framework in TipTap (suggestion plugin + extension API)
- [ ] Built-in slash commands: `/today`, `/yesterday`, `/tomorrow`, `/quote`, `/code`, `/template`, `/search`, `/embed`
- [ ] Templates with variables (`{{date}}`, `{{title}}`, `{{cursor}}`, `{{prompt:…}}`); settings UI to manage user templates
- [ ] Daily notes: auto-create `YYYY-MM-DD.md`; calendar widget in sidebar; auto-link to previous/next day
- [ ] Mermaid block (custom TipTap node + mermaid client; render-on-blur to keep typing fast)
- [ ] KaTeX inline + block math
- [ ] Kanban view: derive board from `- [ ]` / `- [x]` checkboxes across the vault, grouped by `#status/*` tags
- [ ] Settings section for editor-speed features

### Week 24: Capture & Ingestion
- [ ] Browser extension (Chromium + Firefox, manifest v3): right-click → "Save to VaultKeeper" → Readability-cleaned markdown
- [ ] Tauri local HTTP listener (loopback only) for the extension to POST captures to the desktop app
- [ ] Native messaging fallback so the extension works when Tauri is closed (queue → flush on next launch)
- [ ] Voice capture button (desktop + mobile): record → local `whisper.cpp` → insert markdown at cursor
- [ ] Whisper model download UX (opt-in, ~150MB `ggml-base.en`); model stored in app data dir
- [ ] Android share-target: `text/plain` + `image/*` intent filters; receiver creates note from share
- [ ] iOS Share Extension + Shortcuts action ("Append to VaultKeeper", "New note in VaultKeeper")
- [ ] Desktop quick-capture floating window (global hotkey, default `Ctrl+Shift+N`)

### Week 25: Cross-Platform Reach
- [ ] New `apps/web` workspace: Vite + React, reuses `apps/desktop/src` UI tree minus Tauri-only bits
- [ ] Replace Tauri `invoke` calls with HTTP fetch against the sync server's authenticated API
- [ ] Service worker for offline + IndexedDB cache of recent notes
- [ ] PWA manifest, install prompt, web push notifications
- [ ] Apple Watch companion app: complication + voice/quick-text capture; syncs through paired iOS app
- [ ] Wear OS tile + voice intent (mirror of the Watch experience)
- [ ] Watch auth flow: paired-with-phone token, no separate login

### Week 26: Pro-Tier Security & Sync
- [ ] Vault-level passphrase: derives a key independent of the account password; gates vault contents on each app launch
- [ ] Biometric unlock on mobile (FaceID / fingerprint) wraps the passphrase in the platform secure enclave
- [ ] Tunable Argon2id parameters per vault
- [ ] Auto-lock timer + manual lock button + "panic key" shortcut
- [ ] Selective sync: per-device exclude list (folder paths and glob patterns)
- [ ] Extend sync protocol: server filters `device.exclude_paths` so excluded payloads never reach that device
- [ ] Settings UI for passphrase + selective sync
- [ ] Per-folder encryption profiles (defer-friendly; needed for shared vaults)

### Week 27: Public Demo & Launch
- [ ] Final bug fixes
- [ ] Performance audit against this doc's targets (note open <100ms, search <50ms, sync <200ms)
- [ ] Documentation completion: README, `docs/`, screenshots, asciinema demos
- [ ] Public demo vault deployed on the Pi behind Tailscale Funnel (or read-only mirror at a public URL)
- [ ] Seed demo vault with curated showcase notes that exercise graph + AI features
- [ ] README hero: link + screenshot of the live demo
- [ ] Closed beta → open beta
- [ ] Public `v1.0.0` release
- [ ] Launch posts: Hacker News, Lobsters, r/selfhosted, r/ObsidianMD

**Deliverable:** A note app people actually switch to — fast capture, multi-surface reach, encrypted at rest, with a clickable public demo on the README.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Note open time | < 100ms |
| Search response | < 50ms |
| Sync latency | < 200ms |
| Memory usage (server) | < 256MB |
| Memory usage (desktop) | < 512MB |
| Vault size support | 100,000+ notes |
| Sync conflict rate | < 1% |
| App crash rate | < 0.1% |
