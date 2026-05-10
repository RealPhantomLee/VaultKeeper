import {
  SyncRequest,
  SyncResponse,
  SyncOperation,
  SyncConflict,
} from "@vaultkeeper/types";
import { hashContent } from "@vaultkeeper/crypto";
import { SYNC_PROTOCOL_VERSION } from "@vaultkeeper/config";

export interface SyncState {
  syncVersion: number;
  operations: Map<string, SyncOperation>;
  deviceVersions: Map<string, number>;
  conflictLog: SyncConflict[];
}

export function createSyncRequest(
  deviceId: string,
  vaultId: string,
  lastSyncVersion: number,
  localOperations: SyncOperation[],
): SyncRequest {
  return {
    deviceId,
    vaultId,
    lastSyncVersion,
    operations: localOperations,
    clientVersion: SYNC_PROTOCOL_VERSION,
  };
}

export function applyOperations(
  currentState: SyncState,
  operations: SyncOperation[],
): { newState: SyncState; conflicts: SyncConflict[] } {
  const newState = { ...currentState };
  newState.operations = new Map(currentState.operations);
  newState.conflictLog = [...currentState.conflictLog];
  const conflicts: SyncConflict[] = [];

  for (const op of operations) {
    const existing = newState.operations.get(op.path);

    if (existing && existing.hash !== op.hash) {
      if (existing.status !== "synced") {
        newState.operations.set(op.path, op);
        continue;
      }

      const conflict: SyncConflict = {
        id: generateConflictId(op.path, op.deviceId),
        path: op.path,
        localVersion: {
          hash: existing.hash,
          content: existing.content || "",
          deviceId: existing.deviceId,
          timestamp: existing.timestamp,
          version: existing.version || 1,
        },
        remoteVersion: {
          hash: op.hash,
          content: op.content || "",
          deviceId: op.deviceId,
          timestamp: op.timestamp,
          version: (existing.version || 1) + 1,
        },
        createdAt: new Date(),
        resolved: false,
      };

      conflicts.push(conflict);
      newState.conflictLog.push(conflict);
    } else {
      newState.operations.set(op.path, op);
    }
  }

  newState.syncVersion++;
  return { newState, conflicts };
}

export function resolveConflict(
  conflict: SyncConflict,
  resolution: "local" | "remote" | "merged",
  mergedContent?: string,
): SyncOperation {
  const winner =
    resolution === "local" ? conflict.localVersion : conflict.remoteVersion;

  return {
    id: conflict.id,
    type: "update",
    path: conflict.path,
    content: resolution === "merged" ? mergedContent : winner.content,
    hash: hashContent(
      resolution === "merged" ? mergedContent || "" : winner.content,
    ),
    timestamp: new Date(),
    deviceId: winner.deviceId,
    status: "synced",
    retryCount: 0,
  };
}

export function computeDiff(
  localContent: string,
  remoteContent: string,
): { added: string; removed: string; common: string } {
  const localLines = localContent.split("\n");
  const remoteLines = remoteContent.split("\n");

  const common: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  let i = 0;
  let j = 0;

  while (i < localLines.length && j < remoteLines.length) {
    if (localLines[i] === remoteLines[j]) {
      common.push(localLines[i]);
      i++;
      j++;
    } else {
      removed.push(localLines[i]);
      added.push(remoteLines[j]);
      i++;
      j++;
    }
  }

  while (i < localLines.length) {
    removed.push(localLines[i]);
    i++;
  }

  while (j < remoteLines.length) {
    added.push(remoteLines[j]);
    j++;
  }

  return {
    added: added.join("\n"),
    removed: removed.join("\n"),
    common: common.join("\n"),
  };
}

export function mergeContent(
  base: string,
  local: string,
  remote: string,
): string {
  if (local === remote) return local;
  if (local === base) return remote;
  if (remote === base) return local;

  const mergedLines: string[] = [];
  const baseLines = base.split("\n");
  const localLines = local.split("\n");
  const remoteLines = remote.split("\n");

  const maxLen = Math.max(localLines.length, remoteLines.length, baseLines.length);

  for (let i = 0; i < maxLen; i++) {
    const baseLine = baseLines[i] ?? "";
    const localLine = localLines[i] ?? "";
    const remoteLine = remoteLines[i] ?? "";

    if (localLine === remoteLine) {
      mergedLines.push(localLine);
    } else if (localLine === baseLine) {
      mergedLines.push(remoteLine);
    } else if (remoteLine === baseLine) {
      mergedLines.push(localLine);
    } else {
      mergedLines.push(localLine);
      mergedLines.push("<<<<<<< local");
      mergedLines.push(remoteLine);
      mergedLines.push(">>>>>>> remote");
    }
  }

  return mergedLines.join("\n");
}

export function createSyncResponse(
  success: boolean,
  newSyncVersion: number,
  operations: SyncOperation[],
  conflicts: SyncConflict[],
): SyncResponse {
  return {
    success,
    newSyncVersion,
    operations,
    conflicts,
    serverTime: new Date(),
  };
}

function generateConflictId(path: string, deviceId: string): string {
  const timestamp = Date.now().toString(36);
  return `${path}-${deviceId}-${timestamp}`;
}

export function validateSyncRequest(request: SyncRequest): boolean {
  if (!request.deviceId || !request.vaultId) return false;
  if (request.clientVersion !== SYNC_PROTOCOL_VERSION) return false;
  if (request.lastSyncVersion < 0) return false;

  for (const op of request.operations) {
    if (!op.id || !op.path || !op.hash) return false;
    if (!["create", "update", "delete"].includes(op.type)) return false;
    if (op.type !== "delete" && !op.content) return false;
  }

  return true;
}

export class SyncStateManager {
  private state: SyncState;

  constructor(initialVersion: number = 0) {
    this.state = {
      syncVersion: initialVersion,
      operations: new Map(),
      deviceVersions: new Map(),
      conflictLog: [],
    };
  }

  getState(): SyncState {
    return { ...this.state };
  }

  getSyncVersion(): number {
    return this.state.syncVersion;
  }

  getConflicts(): SyncConflict[] {
    return [...this.state.conflictLog.filter((c) => !c.resolved)];
  }

  markConflictResolved(conflictId: string, resolution: string): void {
    const conflict = this.state.conflictLog.find((c) => c.id === conflictId);
    if (conflict) {
      conflict.resolved = true;
      conflict.resolution = resolution as "local" | "remote" | "merged";
    }
  }

  updateDeviceVersion(deviceId: string, version: number): void {
    this.state.deviceVersions.set(deviceId, version);
  }

  getPendingOperations(deviceId: string): SyncOperation[] {
    const deviceVersion = this.state.deviceVersions.get(deviceId) ?? 0;
    return Array.from(this.state.operations.values()).filter(
      (op) => op.status === "pending" && op.timestamp > new Date(deviceVersion),
    );
  }
}
