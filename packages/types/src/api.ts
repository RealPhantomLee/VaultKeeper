export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface AuthRequest {
  username: string;
  password: string;
  deviceId: string;
  deviceName: string;
  devicePublicKey: string;
}

export interface AuthResponse {
  token: string;
  deviceId: string;
  expiresAt: Date;
  syncVersion: number;
}

export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  uptime: number;
  database: DatabaseHealth;
  storage: StorageHealth;
}

export interface DatabaseHealth {
  status: "ok" | "error";
  latency: number;
}

export interface StorageHealth {
  status: "ok" | "warning" | "error";
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
}

export interface BackupInfo {
  id: string;
  vaultId: string;
  createdAt: Date;
  size: number;
  compressed: boolean;
  path: string;
  status: "completed" | "in-progress" | "failed";
}

export interface SyncStatus {
  deviceId: string;
  lastSyncAt: Date;
  pendingOperations: number;
  conflicts: number;
  syncVersion: number;
}
