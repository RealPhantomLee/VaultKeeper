# Arch Linux Deployment Guide

This guide covers setting up VaultKeeper on Arch Linux.

## Prerequisites
- Arch Linux (x86_64 or ARM64)
- `pacman` with sudo privileges
- Docker and Docker Compose

## System Setup

### 1. Install Dependencies
```bash
sudo pacman -Syu --noconfirm docker docker-compose git nodejs npm pnpm rustup
rustup default stable
```

### 2. Configure Docker
```bash
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```
*(Logout and log back in for group changes to take effect)*

## Deployment Files
The following files are used for Arch Linux deployments:
- `/deploy/compose/arch-docker-compose.yml`: Arch-specific override/config
- `/deploy/scripts/arch-install.sh`: Automated install script
- `/etc/systemd/system/vaultkeeper.service`: Systemd unit file for the server

## Setup
Follow the main server deployment guide after preparing the Arch environment.
