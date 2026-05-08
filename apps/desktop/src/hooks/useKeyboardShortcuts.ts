import { useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Command } from "@vaultkeeper/types";
import { useCommandStore } from "@stores/command";

export function useKeyboardShortcuts(commands: Command[]) {
  const { executeCommand } = useCommandStore();

  const hotkeyCommands = commands.filter((c) => c.hotkey);

  for (const cmd of hotkeyCommands) {
    const hotkey = cmd.hotkey!
      .replace("Ctrl+", "ctrl+")
      .replace("Shift+", "shift+")
      .replace("Alt+", "alt+")
      .replace("Meta+", "meta+")
      .toLowerCase();

    useHotkeys(
      hotkey,
      (e) => {
        e.preventDefault();
        executeCommand(cmd.id);
      },
      { preventDefault: true },
      [executeCommand, cmd.id],
    );
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "p" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        const { togglePalette } = useCommandStore.getState();
        togglePalette();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
