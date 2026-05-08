import { create } from "zustand";
import { Vault, Note, VaultSettings } from "@vaultkeeper/types";
import { DEFAULT_SYNC_PORT } from "@vaultkeeper/config";

interface VaultState {
  currentVault: Vault | null;
  vaults: Vault[];
  notes: Map<string, Note>;
  noteIds: string[];
  isLoading: boolean;
  error: string | null;

  initializeVault: () => Promise<void>;
  loadVaults: () => Promise<void>;
  openVault: (path: string) => Promise<void>;
  closeVault: () => void;
  createNote: (path: string, content?: string) => Promise<Note>;
  updateNote: (id: string, content: string) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  getNote: (id: string) => Note | undefined;
  getNoteByPath: (path: string) => Note | undefined;
  searchNotes: (query: string) => Note[];
  getRecentNotes: (limit?: number) => Note[];
  updateVaultSettings: (settings: Partial<VaultSettings>) => Promise<void>;
}

const defaultSettings: VaultSettings = {
  theme: "system",
  editorFontSize: 16,
  editorFontFamily: "var(--font-sans)",
  lineNumbers: false,
  spellCheck: true,
  showLineNumber: false,
  defaultNewNoteLocation: "root",
  newFileExtension: ".md",
  attachmentFolderPath: "./attachments",
  useMarkdownLinks: false,
  useWikiLinks: true,
  defaultViewMode: "source",
  graphSettings: {
    showOrphans: true,
    showAttachments: false,
    showTags: false,
    localGraphDepth: 1,
    arrowHeadSize: 1,
    linkDistance: 100,
    repulsion: 300,
    gravity: 0.1,
  },
  syncSettings: {
    enabled: false,
    serverUrl: `http://localhost:${DEFAULT_SYNC_PORT}`,
    authToken: "",
    syncInterval: 30000,
    autoSync: true,
    encryptBeforeSync: true,
    resolveConflicts: "manual",
  },
  backupSettings: {
    enabled: false,
    backupPath: "",
    backupInterval: 3600000,
    maxBackups: 10,
    compressBackups: true,
  },
  securitySettings: {
    autoLockTimeout: 300000,
    requirePasswordOnStart: false,
    encryptionEnabled: false,
  },
};

export const useVaultStore = create<VaultState>((set, get) => ({
  currentVault: null,
  vaults: [],
  notes: new Map(),
  noteIds: [],
  isLoading: false,
  error: null,

  initializeVault: async () => {
    set({ isLoading: true, error: null });
    try {
      const vaults = get().vaults;
      if (vaults.length > 0 && vaults[0]) {
        await get().openVault(vaults[0].path);
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to initialize vault" });
    } finally {
      set({ isLoading: false });
    }
  },

  loadVaults: async () => {
    set({ isLoading: true });
    try {
      const stored = localStorage.getItem("vaultkeeper:vaults");
      if (stored) {
        set({ vaults: JSON.parse(stored) });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load vaults" });
    } finally {
      set({ isLoading: false });
    }
  },

  openVault: async (path: string) => {
    set({ isLoading: true, error: null });
    try {
      const vault: Vault = {
        id: `vault-${Date.now()}`,
        name: path.split("/").pop() || "Untitled",
        path,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        noteCount: 0,
        attachmentCount: 0,
        totalSize: 0,
        encryptionEnabled: false,
        syncEnabled: false,
        settings: defaultSettings,
      };

      set({ currentVault: vault });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to open vault" });
    } finally {
      set({ isLoading: false });
    }
  },

  closeVault: () => {
    set({ currentVault: null, notes: new Map(), noteIds: [] });
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
      return {
        notes: newNotes,
        noteIds: [...state.noteIds, id],
      };
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
      fileSize: new Blob([content]).size,
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

  getNoteByPath: (path: string) => {
    for (const note of get().notes.values()) {
      if (note.path === path) return note;
    }
    return undefined;
  },

  searchNotes: (query: string) => {
    const lowerQuery = query.toLowerCase();
    return Array.from(get().notes.values()).filter(
      (note) =>
        !note.isDeleted &&
        (note.title.toLowerCase().includes(lowerQuery) ||
          note.content.toLowerCase().includes(lowerQuery) ||
          note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))),
    );
  },

  getRecentNotes: (limit = 10) => {
    return Array.from(get().notes.values())
      .filter((note) => !note.isDeleted)
      .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
      .slice(0, limit);
  },

  updateVaultSettings: async (settings: Partial<VaultSettings>) => {
    const vault = get().currentVault;
    if (!vault) return;

    set({
      currentVault: {
        ...vault,
        settings: { ...vault.settings, ...settings },
        updatedAt: new Date(),
      },
    });
  },
}));
