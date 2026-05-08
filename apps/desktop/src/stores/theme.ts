import { create } from "zustand";

type ThemeMode = "light" | "dark" | "system";

interface ThemeStore {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  applyTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: "system",
  isDark: false,

  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem("vaultkeeper:theme", theme);
    get().applyTheme();
  },

  toggleTheme: () => {
    const { isDark } = get();
    get().setTheme(isDark ? "light" : "dark");
  },

  applyTheme: () => {
    const { theme } = get();
    let isDark: boolean;

    if (theme === "system") {
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    } else {
      isDark = theme === "dark";
    }

    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    set({ isDark });
  },
}));
