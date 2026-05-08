import { create } from "zustand";
import { SyncMetadata, SyncOperation, SyncConflict } from "@vaultkeeper/types";

interface SyncStore {
  metadata: SyncMetadata | null;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  pendingOperations: SyncOperation[];
  conflicts: SyncConflict[];
  error: string | null;
  syncVersion: number;

  initializeSync: () => Promise<void>;
  startSync: () => Promise<void>;
  stopSync: () => void;
  addOperation: (operation: SyncOperation) => void;
  resolveConflict: (conflictId: string, resolution: "local" | "remote" | "merged") => void;
  clearError: () => void;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  metadata: null,
  isSyncing: false,
  lastSyncAt: null,
  pendingOperations: [],
  conflicts: [],
  error: null,
  syncVersion: 0,

  initializeSync: async () => {
    try {
      const stored = localStorage.getItem("vaultkeeper:sync");
      if (stored) {
        set({ metadata: JSON.parse(stored) });
      }
    } catch {
      set({ error: "Failed to initialize sync" });
    }
  },

  startSync: async () => {
    set({ isSyncing: true, error: null });
    try {
      const { pendingOperations } = get();
      if (pendingOperations.length === 0) {
        set({ isSyncing: false, lastSyncAt: new Date() });
        return;
      }
      set({ isSyncing: false, lastSyncAt: new Date(), pendingOperations: [] });
    } catch (err) {
      set({
        isSyncing: false,
        error: err instanceof Error ? err.message : "Sync failed",
      });
    }
  },

  stopSync: () => {
    set({ isSyncing: false });
  },

  addOperation: (operation) =>
    set((state) => ({
      pendingOperations: [...state.pendingOperations, operation],
    })),

  resolveConflict: (conflictId, resolution) =>
    set((state) => ({
      conflicts: state.conflicts
        .filter((c) => c.id !== conflictId)
        .map((c) =>
          c.id === conflictId ? { ...c, resolved: true, resolution } : c,
        ),
    })),

  clearError: () => set({ error: null }),
}));
