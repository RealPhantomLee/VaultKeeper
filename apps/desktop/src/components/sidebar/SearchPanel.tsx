import { useState, useEffect } from "react";
import { useVaultStore } from "@stores/vault";
import { useEditorStore } from "@stores/editor";
import { Note } from "@vaultkeeper/types";
import { Search } from "lucide-react";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Note[]>([]);
  const { searchNotes } = useVaultStore();
  const { openNote } = useEditorStore();

  useEffect(() => {
    if (query.length > 0) {
      setResults(searchNotes(query));
    } else {
      setResults([]);
    }
  }, [query, searchNotes]);

  return (
    <div className="p-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes..."
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:border-accent"
          aria-label="Search notes"
        />
      </div>

      <div className="mt-2 space-y-1">
        {results.map((note) => (
          <button
            key={note.id}
            onClick={() => openNote(note.id)}
            className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-background-hover"
          >
            <div className="font-medium truncate">{note.title}</div>
            {note.content && (
              <div className="text-xs text-foreground-muted truncate mt-0.5">
                {note.content.slice(0, 100)}
              </div>
            )}
          </button>
        ))}

        {query.length > 0 && results.length === 0 && (
          <div className="text-center text-foreground-muted text-sm py-4">
            No results found
          </div>
        )}
      </div>
    </div>
  );
}
