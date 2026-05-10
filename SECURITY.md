# Security Policy

## Reporting a Vulnerability

If you believe you've found a security vulnerability in VaultKeeper, please report it privately rather than opening a public issue.

**Contact:** chucktuck22@gmail.com

When reporting, please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept code or a minimal test case is appreciated)
- The component affected (server, desktop app, mobile app, sync protocol, crypto package, or deployment scripts)
- The version or commit SHA you tested against

You should expect an acknowledgement within 72 hours. I'll work with you on a coordinated disclosure timeline — typical fix windows are 14 days for high-severity issues and 30 days for lower-severity ones.

## Scope

In scope:

- The Rust sync server (`server/`)
- The Tauri desktop app (`apps/desktop/`)
- The React Native mobile app (`apps/mobile/`)
- The shared crypto and sync-protocol packages
- The Docker / Nginx / systemd deployment artifacts

Out of scope:

- Vulnerabilities in third-party dependencies (please report those upstream and we'll bump pins)
- Self-hosted misconfigurations that aren't a result of insecure defaults shipped in this repo
- Social engineering, physical attacks, or DoS against any deployed instance

## Threat Model

VaultKeeper is **local-first and self-hosted**. The default deployment posture is:

- Sync server reachable only on a Tailscale tailnet (no public exposure required)
- All API routes except `/health`, `/auth/register`, `/auth/login` require a valid JWT
- Passwords hashed with Argon2id (Pi 5–tuned: 64 MiB / 2 iter / 1 lane)
- Optional client-side end-to-end encryption (XChaCha20-Poly1305) so the server stores ciphertext only
- Rate limiting on auth endpoints (5/min login, 3/min register) via `tower_governor`
- Device-bound tokens: `/sync` rejects requests where the body's `device_id` does not match the JWT claim

What this implies for reporters: issues that require an authenticated user on the same tailnet to attack another user on that tailnet are in scope; issues that require physical access to an unlocked desktop are not.
