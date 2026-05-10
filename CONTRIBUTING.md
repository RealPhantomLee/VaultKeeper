# Contributing to VaultKeeper

Thanks for your interest. This repo is a pnpm + Turborepo workspace with a Rust sync server alongside the TypeScript apps.

## Prerequisites

| Tool   | Version         | How                                              |
|--------|-----------------|--------------------------------------------------|
| Node   | 22 (`.nvmrc`)   | `nvm use` or install Node 22 directly             |
| pnpm   | 10+             | `npm i -g pnpm` (or `corepack enable`)            |
| Rust   | 1.95 (`rust-toolchain.toml` pins it)             | `rustup` will pick this up automatically when you `cd` into the repo |
| just   | optional        | `cargo install just` — recipes live in `justfile` |
| Docker | 24+ with Compose v2 | only required for running the stack locally   |

## Bootstrap

```bash
git clone https://github.com/RealPhantomLee/VaultKeeper.git
cd VaultKeeper

# Install JS deps
pnpm install --frozen-lockfile

# Install pre-commit / pre-push hooks (lefthook)
pnpm dlx lefthook install
```

`rust-toolchain.toml` will trigger rustup to install Rust 1.95 + clippy + rustfmt the first time you run a cargo command in `server/` or `apps/desktop/src-tauri/`.

## Common commands

The `justfile` is the canonical entry point. `just` with no arguments lists every recipe.

```bash
just dev-server     # cargo run, auto-reloads if cargo-watch is installed
just dev-desktop    # tauri dev
just dev-mobile     # metro bundler
just typecheck      # pnpm -r typecheck (all packages)
just check-server   # cargo check
just lint-server    # cargo clippy -- -D warnings
just build-server   # cargo build --release
just doctor         # tool versions + git/docker status
```

Plain pnpm scripts also work (`pnpm dev`, `pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm format`, `pnpm format:check`).

## Pre-commit / pre-push hooks

`lefthook.yml` runs:

- `prettier --check` on staged TS/JS/JSON/MD/YAML
- `cargo fmt --check` on staged Rust
- `cargo check` when Rust files are touched
- a regex secret scan over the staged diff
- `pnpm -r typecheck` and `cargo clippy -D warnings` on `pre-push`

If a hook fails, **fix the underlying issue** rather than bypassing with `--no-verify`. Hooks exist because something already went wrong without them.

## Workflow

1. Fork and create a feature branch (`git checkout -b feature/<thing>`).
2. Make focused commits — one logical change per commit, present-tense imperative subject ("add", "fix", "rename" — not "added"/"fixes").
3. Run `pnpm typecheck`, `pnpm test`, and `cd server && cargo clippy -- -D warnings` before pushing.
4. Open a PR against `main` with:
   - What changed and why
   - How you verified it (commands run, manual test steps)
   - Any follow-ups you're explicitly punting

CI mirrors the local checks (see `.github/workflows/ci.yml`).

## Code style

- TypeScript: Prettier defaults; ESLint where wired
- Rust: `cargo fmt`; clippy clean (`-D warnings`)
- Commit messages: subject line ≤ 72 chars; body wrapped at 80; **no AI assistant trailers** (no `Co-Authored-By: Claude`, no `Generated-with-...`)

## Reporting security issues

See [SECURITY.md](SECURITY.md). Don't open public issues for vulnerabilities.

## License

By contributing, you agree your contributions will be licensed under the [MIT License](LICENSE).
