# VaultKeeper API Contracts

## Base URL
```
http://<raspberry-pi-ip>:3456/api/v1
```

## Authentication
All endpoints (except `/auth/register` and `/auth/login`) require a Bearer token.
```
Authorization: Bearer <jwt_token>
```

---

## Authentication

### POST /auth/register
Register a new user account.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": { "id": "uuid", "username": "string" },
  "error": null,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### POST /auth/login
Authenticate and receive a token.

**Request:**
```json
{
  "username": "string",
  "password": "string",
  "device_id": "string",
  "device_name": "string",
  "device_public_key": "string"
}
```

**Response (200):**
```json
{
  "token": "jwt_string",
  "device_id": "string",
  "expires_at": "2024-02-01T00:00:00Z",
  "sync_version": 0
}
```

---

## Sync

### POST /sync
Submit local operations and receive remote changes.

**Request:**
```json
{
  "device_id": "string",
  "vault_id": "string",
  "last_sync_version": 0,
  "operations": [
    {
      "id": "string",
      "type": "create|update|delete",
      "path": "string",
      "content": "string (optional)",
      "hash": "string",
      "timestamp": "2024-01-01T00:00:00Z",
      "device_id": "string"
    }
  ],
  "client_version": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "new_sync_version": 1,
  "operations": [
    {
      "id": "string",
      "type": "string",
      "path": "string",
      "content": "string",
      "hash": "string",
      "version": 1
    }
  ],
  "conflicts": [
    {
      "id": "string",
      "path": "string",
      "local_hash": "string",
      "remote_hash": "string",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "server_time": "2024-01-01T00:00:00Z"
}
```

### GET /sync/status
Get current sync status.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "pending_operations": 0,
    "conflicts": 0,
    "device_id": "string"
  }
}
```

### GET /sync/conflicts
List unresolved sync conflicts.

### POST /sync/conflicts/:id/resolve
Resolve a sync conflict.

**Request:**
```json
{
  "resolution": "local|remote|merged"
}
```

---

## Vaults

### GET /vaults
List all vaults for the authenticated user.

### POST /vaults
Create a new vault.

**Request:**
```json
{
  "name": "string"
}
```

### GET /vaults/:id
Get vault details.

---

## Devices

### POST /auth/device
Register a new device.

### GET /devices
List all devices for the authenticated user.

---

## Backups

### GET /backups
List recent backups.

### POST /backups
Trigger a new backup.

---

## WebSocket

### GET /ws/sync
Establish a WebSocket connection for real-time sync events.

**Events received:**
- `sync:started` - Sync operation began
- `sync:completed` - Sync operation finished
- `sync:conflict` - New conflict detected
- `device:connected` - Another device connected
- `device:disconnected` - Device disconnected
- `backup:completed` - Backup finished

---

## Error Response Format

All errors follow this format:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_INPUT | 400 | Missing or invalid request body |
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict (e.g., duplicate username) |
| INTERNAL_ERROR | 500 | Server internal error |
| VAULT_NOT_FOUND | 404 | Specified vault does not exist |
| TOKEN_ERROR | 500 | Failed to generate/validate token |
| DB_ERROR | 500 | Database operation failed |
