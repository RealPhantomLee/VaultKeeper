import { useVaultStore } from "@stores/vault";
import { useEditorStore } from "@stores/editor";
import { Plus, FileText, Zap } from "lucide-react";

export function EmptyState() {
  const { createNote } = useVaultStore();
  const { openNote } = useEditorStore();

  const handleCreateNote = async () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const note = await createNote(`Untitled-${timestamp}.md`, "");
    openNote(note.id);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center text-foreground-muted">
      <div className="text-center max-w-md">
        <Zap className="w-16 h-16 mx-auto mb-6 opacity-20" />
        <h2 className="text-2xl font-semibold mb-2 text-foreground">
          Welcome to VaultKeeper
        </h2>
        <p className="mb-8 text-foreground-secondary">
          Create your first note to start building your knowledge vault.
        </p>
        <button
          onClick={handleCreateNote}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Note
        </button>

        <div className="mt-12 grid grid-cols-3 gap-6 text-sm">
          <div className="text-center">
            <FileText className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p>Markdown files</p>
          </div>
          <div className="text-center">
            <Zap className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p>Local-first</p>
          </div>
          <div className="text-center">
            <Zap className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p>E2E Encrypted</p>
          </div>
        </div>
      </div>
    </div>
  );
}
