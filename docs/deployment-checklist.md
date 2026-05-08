# Production Deployment Checklist

## Pre-Deployment

### Infrastructure
- [ ] Raspberry Pi 5 (8GB) procured and tested
- [ ] USB 3.0 SSD installed and formatted
- [ ] Static IP configured on local network
- [ ] Router firewall configured
- [ ] UPS/battery backup (recommended)

### Security
- [ ] SSH keys configured (password auth disabled)
- [ ] Fail2ban installed and configured
- [ ] UFW firewall rules verified
- [ ] Strong JWT secret generated (64+ chars)
- [ ] SSL certificates obtained (or Tailscale configured)
- [ ] Rate limiting enabled

### Networking
- [ ] Tailscale installed and authenticated
- [ ] DNS configured (optional)
- [ ] Port forwarding disabled (use Tailscale)
- [ ] Network bandwidth tested

### Application
- [ ] All environment variables configured
- [ ] Docker Compose file validated
- [ ] SSL certificates placed in correct directory
- [ ] Backup paths verified with write permissions

## Deployment

### Server Setup
- [ ] Raspberry Pi OS Lite (64-bit) installed
- [ ] System updated (`apt update && apt upgrade`)
- [ ] Docker and Docker Compose installed
- [ ] Setup script executed successfully
- [ ] Services started (`docker compose up -d`)

### Verification
- [ ] Health check passes: `curl http://localhost:8080/health`
- [ ] Sync server responds on port 3456
- [ ] Nginx proxies correctly
- [ ] SSL/TLS valid (if configured)
- [ ] Tailscale connectivity verified

### Client Setup
- [ ] Desktop app installed on primary device
- [ ] Mobile app installed on phone/tablet
- [ ] Vault created and synced
- [ ] Test note created and synced between devices
- [ ] Search functionality verified
- [ ] Graph view renders correctly

## Post-Deployment

### Monitoring
- [ ] Docker health checks passing
- [ ] Auto-update timer active
- [ ] Backup cron job running
- [ ] Log rotation configured
- [ ] Disk space monitoring set up

### Backup Verification
- [ ] Manual backup created successfully
- [ ] Backup file integrity verified
- [ ] Backup restoration tested
- [ ] Retention policy confirmed (30 days)
- [ ] Offsite backup configured (optional)

### Security Audit
- [ ] No ports exposed to public internet
- [ ] All default passwords changed
- [ ] SSH key-only authentication enforced
- [ ] Container resource limits applied
- [ ] Audit logs reviewed

### Performance
- [ ] Response time < 200ms for API calls
- [ ] Sync completes in < 5 seconds for 100 notes
- [ ] Memory usage < 512MB
- [ ] CPU usage < 50% idle
- [ ] Disk I/O within acceptable range

## Maintenance Schedule

### Daily
- [ ] Check health endpoint
- [ ] Review sync logs for errors

### Weekly
- [ ] Review backup logs
- [ ] Check disk space usage
- [ ] Verify container status

### Monthly
- [ ] Test backup restoration
- [ ] Review security logs
- [ ] Update Docker images
- [ ] Check SSL certificate expiry

### Quarterly
- [ ] Full system audit
- [ ] Performance benchmarking
- [ ] Security penetration test (optional)
- [ ] Disaster recovery drill

## Rollback Plan

If deployment fails:
```bash
# Stop current deployment
docker compose down

# Restore from last known good image
docker compose pull vaultkeeper-sync-server:<previous-version>
docker compose up -d

# Verify
curl http://localhost:8080/health
```

## Emergency Contacts

- Server admin: [contact]
- Tailscale support: https://tailscale.com/support
- Docker troubleshooting: https://docs.docker.com/
