import { create } from "zustand";
import { Command } from "@vaultkeeper/types";

interface CommandStore {
  commands: Command[];
  isPaletteOpen: boolean;
  searchQuery: string;
  registerCommands: (commands: Command[]) => void;
  unregisterCommand: (id: string) => void;
  executeCommand: (id: string) => Promise<void>;
  togglePalette: () => void;
  setSearchQuery: (query: string) => void;
  getFilteredCommands: () => Command[];
}

export const useCommandStore = create<CommandStore>((set, get) => ({
  commands: [],
  isPaletteOpen: false,
  searchQuery: "",

  registerCommands: (commands) =>
    set((state) => ({
      commands: [
        ...state.commands.filter((c) => !commands.some((nc) => nc.id === c.id)),
        ...commands,
      ],
    })),

  unregisterCommand: (id) =>
    set((state) => ({
      commands: state.commands.filter((c) => c.id !== id),
    })),

  executeCommand: async (id) => {
    const command = get().commands.find((c) => c.id === id);
    if (command) {
      await command.callback();
    }
  },

  togglePalette: () =>
    set((state) => ({
      isPaletteOpen: !state.isPaletteOpen,
      searchQuery: "",
    })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  getFilteredCommands: () => {
    const { commands, searchQuery } = get();
    if (!searchQuery) return commands;

    const lowerQuery = searchQuery.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(lowerQuery) ||
        (cmd.description?.toLowerCase().includes(lowerQuery) ?? false),
    );
  },
}));
