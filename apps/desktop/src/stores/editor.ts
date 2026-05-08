import { create } from "zustand";
import { EditorState } from "@vaultkeeper/types";

interface EditorStore {
  state: EditorState;
  setActiveNote: (noteId: string) => void;
  openNote: (noteId: string) => void;
  closeNote: (noteId: string) => void;
  closeAllNotes: () => void;
  setPreviewMode: (preview: boolean) => void;
  setCursorPosition: (line: number, ch: number) => void;
  moveTab: (fromIndex: number, toIndex: number) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  state: {
    activeNoteId: null,
    openNotes: [],
    cursorPosition: { line: 0, ch: 0 },
    selection: null,
    previewMode: false,
  },

  setActiveNote: (noteId) =>
    set((state) => ({
      state: { ...state.state, activeNoteId: noteId },
    })),

  openNote: (noteId) =>
    set((state) => ({
      state: {
        ...state.state,
        activeNoteId: noteId,
        openNotes: state.state.openNotes.includes(noteId)
          ? state.state.openNotes
          : [...state.state.openNotes, noteId],
      },
    })),

  closeNote: (noteId) =>
    set((state) => {
      const newOpenNotes = state.state.openNotes.filter((id) => id !== noteId);
      let newActiveNoteId = state.state.activeNoteId;

      if (newActiveNoteId === noteId) {
        const closedIndex = state.state.openNotes.indexOf(noteId);
        if (newOpenNotes.length > 0) {
          const newActiveIndex = Math.min(closedIndex, newOpenNotes.length - 1);
          newActiveNoteId = newOpenNotes[newActiveIndex] ?? null;
        } else {
          newActiveNoteId = null;
        }
      }

      return {
        state: { ...state.state, activeNoteId: newActiveNoteId, openNotes: newOpenNotes },
      };
    }),

  closeAllNotes: () =>
    set({
      state: {
        activeNoteId: null,
        openNotes: [],
        cursorPosition: { line: 0, ch: 0 },
        selection: null,
        previewMode: false,
      },
    }),

  setPreviewMode: (preview) =>
    set((state) => ({
      state: { ...state.state, previewMode: preview },
    })),

  setCursorPosition: (line, ch) =>
    set((state) => ({
      state: { ...state.state, cursorPosition: { line, ch } },
    })),

  moveTab: (fromIndex, toIndex) =>
    set((state) => {
      const newOpenNotes = [...state.state.openNotes];
      const [moved] = newOpenNotes.splice(fromIndex, 1);
      if (moved !== undefined) {
        newOpenNotes.splice(toIndex, 0, moved);
      }
      return { state: { ...state.state, openNotes: newOpenNotes } };
    }),
}));
