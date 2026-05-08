import { create } from "zustand";

type ThemeMode = "light" | "dark" | "system";

interface ThemeStore {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: "system",
  isDark: false,
  setTheme: (theme) => {
    set({ theme, isDark: theme === "dark" });
  },
}));
