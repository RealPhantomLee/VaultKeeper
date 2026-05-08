import { TabBar } from "./TabBar";
import { NoteEditor } from "./NoteEditor";
import { EmptyState } from "./EmptyState";
import { useEditorStore } from "@stores/editor";
import { useVaultStore } from "@stores/vault";

export function EditorArea() {
  const { state } = useEditorStore();
  const { notes } = useVaultStore();

  if (state.openNotes.length === 0) {
    return <EmptyState />;
  }

  const activeNote = state.activeNoteId ? notes.get(state.activeNoteId) : null;

  return (
    <div className="h-full flex flex-col">
      <TabBar />
      <div className="flex-1 overflow-auto">
        {activeNote && <NoteEditor note={activeNote} />}
      </div>
    </div>
  );
}
