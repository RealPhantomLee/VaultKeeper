import { useVaultStore } from "@stores/vault";
import { useEditorStore } from "@stores/editor";
import { useSyncStore } from "@stores/sync";
import { cn } from "@utils/cn";
import { Wifi, WifiOff, Lock, Unlock } from "lucide-react";

export function StatusBar() {
  const { notes } = useVaultStore();
  const { state } = useEditorStore();
  const { isSyncing, lastSyncAt, error } = useSyncStore();

  const activeNote = state.activeNoteId ? notes.get(state.activeNoteId) : null;
  const wordCount = activeNote
    ? activeNote.content.split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div
      className="flex items-center justify-between px-3 py-1 text-xs bg-background-secondary border-t border-border text-foreground-muted"
      role="status"
      aria-label="Status bar"
    >
      <div className="flex items-center gap-3">
        {activeNote && (
          <>
            <span>{wordCount} words</span>
            <span>{activeNote.content.length} characters</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {isSyncing ? (
            <>
              <Wifi className="w-3 h-3 text-status-info animate-pulse" />
              <span>Syncing...</span>
            </>
          ) : lastSyncAt ? (
            <>
              <Wifi className="w-3 h-3 text-status-success" />
              <span>Synced</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-status-success" />
          <span>Encrypted</span>
        </div>

        {error && (
          <span className="text-status-error" role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
