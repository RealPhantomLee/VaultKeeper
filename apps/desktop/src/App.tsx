import { useEffect } from "react";
import { useVaultStore } from "@stores/vault";
import { useSyncStore } from "@stores/sync";
import { useCommandStore } from "@stores/command";
import { useThemeStore } from "@stores/theme";
import { Layout } from "@components/layout/Layout";
import { CommandPalette } from "@components/command/CommandPalette";
import { registerDefaultCommands } from "@utils/commands";
import { useKeyboardShortcuts } from "@hooks/useKeyboardShortcuts";

export function App() {
  const { initializeVault, loadVaults } = useVaultStore();
  const { initializeSync } = useSyncStore();
  const { commands, registerCommands } = useCommandStore();
  const { applyTheme } = useThemeStore();

  useEffect(() => {
    const init = async () => {
      await loadVaults();
      await initializeVault();
      await initializeSync();
    };
    init();
  }, []);

  useEffect(() => {
    const defaultCommands = registerDefaultCommands();
    registerCommands(defaultCommands);
  }, [registerCommands]);

  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  useKeyboardShortcuts(commands);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground">
      <Layout />
      <CommandPalette />
    </div>
  );
}
