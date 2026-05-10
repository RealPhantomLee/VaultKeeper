import { Command } from "@vaultkeeper/types";
import { useCommandStore } from "@stores/command";
import { useVaultStore } from "@stores/vault";
import { useEditorStore } from "@stores/editor";
import { useSidebarStore } from "@stores/sidebar";
import { useThemeStore } from "@stores/theme";
import { useSyncStore } from "@stores/sync";

export function registerDefaultCommands(): Command[] {
  const vaultStore = useVaultStore.getState();
  const editorStore = useEditorStore.getState();
  const sidebarStore = useSidebarStore.getState();
  const themeStore = useThemeStore.getState();

  return [
    {
      id: "create-note",
      name: "Create New Note",
      description: "Create a new note in the current vault",
      hotkey: "Ctrl+N",
      icon: "FilePlus",
      callback: async () => {
        const timestamp = new Date().toISOString().slice(0, 10);
        const note = await vaultStore.createNote(`Untitled-${timestamp}.md`, "");
        editorStore.openNote(note.id);
      },
    },
    {
      id: "toggle-command-palette",
      name: "Open Command Palette",
      description: "Search and run commands",
      hotkey: "Ctrl+P",
      callback: () => {
        useCommandStore.getState().togglePalette();
      },
    },
    {
      id: "toggle-theme",
      name: "Toggle Dark Mode",
      description: "Switch between light and dark themes",
      hotkey: "Ctrl+Shift+D",
      icon: themeStore.isDark ? "Sun" : "Moon",
      callback: () => {
        themeStore.toggleTheme();
      },
    },
    {
      id: "toggle-left-sidebar",
      name: "Toggle Left Sidebar",
      description: "Show or hide the left sidebar",
      hotkey: "Ctrl+B",
      callback: () => {
        sidebarStore.toggleLeftPanel();
      },
    },
    {
      id: "toggle-right-sidebar",
      name: "Toggle Right Sidebar",
      description: "Show or hide the right sidebar",
      hotkey: "Ctrl+J",
      callback: () => {
        sidebarStore.toggleRightPanel();
      },
    },
    {
      id: "close-note",
      name: "Close Current Note",
      description: "Close the currently active note",
      hotkey: "Ctrl+W",
      callback: () => {
        if (editorStore.state.activeNoteId) {
          editorStore.closeNote(editorStore.state.activeNoteId);
        }
      },
    },
    {
      id: "close-all-notes",
      name: "Close All Notes",
      description: "Close all open notes",
      callback: () => {
        editorStore.closeAllNotes();
      },
    },
    {
      id: "toggle-preview",
      name: "Toggle Preview Mode",
      description: "Switch between source and preview mode",
      hotkey: "Ctrl+E",
      callback: () => {
        editorStore.setPreviewMode(!editorStore.state.previewMode);
      },
    },
    {
      id: "sync-now",
      name: "Sync Now",
      description: "Manually trigger a sync",
      hotkey: "Ctrl+S",
      callback: async () => {
        const { startSync } = useSyncStore.getState();
        await startSync();
      },
    },
    {
      id: "search-notes",
      name: "Search Notes",
      description: "Search through all notes",
      hotkey: "Ctrl+Shift+F",
      callback: () => {
        sidebarStore.setActiveLeftPanel("search");
        if (sidebarStore.left.leftCollapsed) {
          sidebarStore.toggleLeftPanel();
        }
      },
    },
    {
      id: "show-graph",
      name: "Show Graph View",
      description: "Open the graph visualization",
      callback: () => {
        sidebarStore.setActiveLeftPanel("graph");
        if (sidebarStore.left.leftCollapsed) {
          sidebarStore.toggleLeftPanel();
        }
      },
    },
    {
      id: "close-vault",
      name: "Close Vault",
      description: "Close the current vault",
      callback: () => {
        vaultStore.closeVault();
        editorStore.closeAllNotes();
      },
    },
  ];
}
