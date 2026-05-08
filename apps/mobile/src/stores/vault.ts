import { create } from "zustand";
import { Note, Vault } from "@vaultkeeper/types";

interface VaultState {
  currentVault: Vault | null;
  notes: Map<string, Note>;
  isLoading: boolean;
  error: string | null;

  initializeVault: () => Promise<void>;
  createNote: (path: string, content?: string) => Promise<Note>;
  updateNote: (id: string, content: string) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  getNote: (id: string) => Note | undefined;
  searchNotes: (query: string) => Note[];
}

export const useVaultStore = create<VaultState>((set, get) => ({
  currentVault: null,
  notes: new Map(),
  isLoading: false,
  error: null,

  initializeVault: async () => {
    set({ isLoading: false });
  },

  createNote: async (path: string, content = "") => {
    const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const title = path.split("/").pop()?.replace(/\.md$/, "") || "Untitled";

    const note: Note = {
      id,
      path,
      title,
      content,
      frontmatter: {},
      tags: [],
      backlinks: [],
      outgoingLinks: [],
      attachments: [],
      createdAt: now,
      updatedAt: now,
      modifiedAt: now,
      fileSize: new Blob([content]).size,
      hash: "",
      version: 1,
      isDeleted: false,
    };

    set((state) => {
      const newNotes = new Map(state.notes);
      newNotes.set(id, note);
      return { notes: newNotes };
    });

    return note;
  },

  updateNote: async (id: string, content: string) => {
    const note = get().notes.get(id);
    if (!note) throw new Error("Note not found");

    const updated: Note = {
      ...note,
      content,
      updatedAt: new Date(),
      modifiedAt: new Date(),
      version: note.version + 1,
    };

    set((state) => {
      const newNotes = new Map(state.notes);
      newNotes.set(id, updated);
      return { notes: newNotes };
    });

    return updated;
  },

  deleteNote: async (id: string) => {
    set((state) => {
      const newNotes = new Map(state.notes);
      const note = newNotes.get(id);
      if (note) {
        newNotes.set(id, { ...note, isDeleted: true, deletedAt: new Date() });
      }
      return { notes: newNotes };
    });
  },

  getNote: (id: string) => get().notes.get(id),

  searchNotes: (query: string) => {
    const lowerQuery = query.toLowerCase();
    return Array.from(get().notes.values()).filter(
      (note) =>
        !note.isDeleted &&
        (note.title.toLowerCase().includes(lowerQuery) ||
          note.content.toLowerCase().includes(lowerQuery)),
    );
  },
}));
