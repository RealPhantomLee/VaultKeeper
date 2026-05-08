import { useEffect, useRef, useState } from "react";
import { useCommandStore } from "@stores/command";
import { useEditorStore } from "@stores/editor";
import { useVaultStore } from "@stores/vault";
import { useThemeStore } from "@stores/theme";
import { cn } from "@utils/cn";
import { Search, FilePlus, Moon, Sun, Monitor, Trash2 } from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FilePlus,
  Moon,
  Sun,
  Monitor,
  Trash2,
};

export function CommandPalette() {
  const { isPaletteOpen, togglePalette, getFilteredCommands, searchQuery, setSearchQuery, executeCommand } = useCommandStore();
  const { createNote, closeVault } = useVaultStore();
  const { openNote, closeAllNotes } = useEditorStore();
  const { theme, setTheme } = useThemeStore();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = getFilteredCommands();

  useEffect(() => {
    if (isPaletteOpen) {
      inputRef.current?.focus();
      setSelectedIndex(0);
    }
  }, [isPaletteOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, commands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = commands[selectedIndex];
      if (cmd) {
        executeCommand(cmd.id);
        togglePalette();
      }
    } else if (e.key === "Escape") {
      togglePalette();
    }
  };

  if (!isPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-start justify-center pt-[20vh]"
      onClick={togglePalette}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-lg bg-background-secondary border border-border rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 border-b border-border">
          <Search className="w-4 h-4 text-foreground-muted" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 py-3 bg-transparent outline-none text-foreground placeholder:text-foreground-muted"
            aria-label="Search commands"
          />
        </div>

        <div className="max-h-80 overflow-auto">
          {commands.map((cmd, index) => {
            const Icon = iconMap[cmd.icon || "FilePlus"];
            return (
              <button
                key={cmd.id}
                onClick={() => {
                  executeCommand(cmd.id);
                  togglePalette();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-background-hover",
                  index === selectedIndex && "bg-background-hover",
                )}
                role="option"
                aria-selected={index === selectedIndex}
              >
                {Icon && <Icon className="w-4 h-4 text-foreground-muted" />}
                <div className="flex-1 text-left">
                  <div>{cmd.name}</div>
                  {cmd.description && (
                    <div className="text-xs text-foreground-muted">
                      {cmd.description}
                    </div>
                  )}
                </div>
                {cmd.hotkey && (
                  <kbd className="px-1.5 py-0.5 text-xs bg-background-tertiary rounded text-foreground-muted">
                    {cmd.hotkey}
                  </kbd>
                )}
              </button>
            );
          })}

          {commands.length === 0 && (
            <div className="py-8 text-center text-foreground-muted">
              No commands found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
