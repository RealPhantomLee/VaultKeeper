export type WsEventType =
  | "sync:started"
  | "sync:completed"
  | "sync:error"
  | "sync:conflict"
  | "vault:updated"
  | "vault:locked"
  | "vault:unlocked"
  | "device:connected"
  | "device:disconnected"
  | "backup:started"
  | "backup:completed"
  | "backup:error";

export interface WsMessage<T> {
  type: WsEventType;
  payload: T;
  timestamp: Date;
  deviceId: string;
}

export interface SyncWsPayload {
  operations: number;
  syncVersion: number;
  deviceId: string;
}

export interface ConflictWsPayload {
  path: string;
  conflictId: string;
  localVersion: number;
  remoteVersion: number;
}

export interface BackupWsPayload {
  backupId: string;
  size: number;
  status: "started" | "completed" | "error";
}
