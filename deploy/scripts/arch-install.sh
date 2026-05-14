#!/bin/bash
# /deploy/scripts/arch-install.sh
set -e

echo "Installing VaultKeeper dependencies on Arch..."
sudo pacman -Syu --noconfirm docker docker-compose git nodejs npm pnpm rustup
rustup default stable

echo "Enabling Docker..."
sudo systemctl enable --now docker

echo "Done."
