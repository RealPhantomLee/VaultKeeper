import { useVaultStore } from "@stores/vault";
import { useEditorStore } from "@stores/editor";

export function BacklinksPanel() {
  const { notes } = useVaultStore();
  const { state, openNote } = useEditorStore();
  const activeNote = state.activeNoteId ? notes.get(state.activeNoteId) : null;

  if (!activeNote) {
    return (
      <div className="p-4 text-center text-foreground-muted text-sm">
        Open a note to see backlinks
      </div>
    );
  }

  const backlinkedNotes = Array.from(notes.values()).filter(
    (note) =>
      !note.isDeleted && note.outgoingLinks.includes(activeNote.path),
  );

  return (
    <div className="p-2">
      <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wide px-2 py-1">
        Backlinks ({backlinkedNotes.length})
      </h3>
      <div className="space-y-1 mt-2">
        {backlinkedNotes.map((note) => (
          <button
            key={note.id}
            onClick={() => openNote(note.id)}
            className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-background-hover"
          >
            <div className="font-medium truncate">{note.title}</div>
          </button>
        ))}
        {backlinkedNotes.length === 0 && (
          <div className="text-center text-foreground-muted text-sm py-4">
            No backlinks found
          </div>
        )}
      </div>
    </div>
  );
}
