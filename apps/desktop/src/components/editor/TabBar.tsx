import { useEditorStore } from "@stores/editor";
import { useVaultStore } from "@stores/vault";
import { cn } from "@utils/cn";
import { X, FileText } from "lucide-react";

export function TabBar() {
  const { state, setActiveNote, closeNote } = useEditorStore();
  const { notes } = useVaultStore();

  return (
    <div
      className="flex items-center border-b border-border bg-background-secondary overflow-x-auto"
      role="tablist"
      aria-label="Open notes"
    >
      {state.openNotes.map((noteId) => {
        const note = notes.get(noteId);
        if (!note) return null;
        const isActive = state.activeNoteId === noteId;

        return (
          <button
            key={noteId}
            role="tab"
            aria-selected={isActive}
            aria-controls={`editor-${noteId}`}
            onClick={() => setActiveNote(noteId)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm border-r border-border min-w-0 max-w-48 hover:bg-background-hover",
              isActive && "bg-background border-b-2 border-b-accent",
            )}
          >
            <FileText className="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
            <span className="truncate flex-1 text-left">{note.title}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                closeNote(noteId);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  closeNote(noteId);
                }
              }}
              className="p-0.5 rounded hover:bg-background-active flex-shrink-0"
              aria-label={`Close ${note.title}`}
            >
              <X className="w-3 h-3" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
