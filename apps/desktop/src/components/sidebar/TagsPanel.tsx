import { useState } from "react";
import { useVaultStore } from "@stores/vault";
import { useEditorStore } from "@stores/editor";
import { cn } from "@utils/cn";

export function TagsPanel() {
  const { notes } = useVaultStore();
  const { openNote } = useEditorStore();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const tagCounts = new Map<string, number>();
  for (const note of notes.values()) {
    if (!note.isDeleted) {
      for (const tag of note.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
  }

  const sortedTags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);

  const filteredNotes = selectedTag
    ? Array.from(notes.values()).filter(
        (n) => !n.isDeleted && n.tags.includes(selectedTag),
      )
    : [];

  return (
    <div className="p-2">
      <div className="flex flex-wrap gap-1">
        {sortedTags.map(([tag, count]) => (
          <button
            key={tag}
            onClick={() =>
              setSelectedTag(selectedTag === tag ? null : tag)
            }
            className={cn(
              "px-2 py-0.5 text-xs rounded-full hover:bg-background-hover",
              selectedTag === tag && "bg-accent text-accent-foreground",
            )}
          >
            #{tag} ({count})
          </button>
        ))}
        {sortedTags.length === 0 && (
          <div className="text-foreground-muted text-sm">No tags yet</div>
        )}
      </div>

      {selectedTag && (
        <div className="mt-3 space-y-1">
          <h4 className="text-xs font-semibold text-foreground-muted uppercase tracking-wide">
            Notes tagged #{selectedTag}
          </h4>
          {filteredNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => openNote(note.id)}
              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-background-hover"
            >
              <div className="font-medium truncate">{note.title}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
