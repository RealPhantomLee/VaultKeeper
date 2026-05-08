/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "var(--color-background)",
          secondary: "var(--color-background-secondary)",
          tertiary: "var(--color-background-tertiary)",
          hover: "var(--color-background-hover)",
          active: "var(--color-background-active)",
        },
        foreground: {
          DEFAULT: "var(--color-foreground)",
          secondary: "var(--color-foreground-secondary)",
          muted: "var(--color-foreground-muted)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          foreground: "var(--color-accent-foreground)",
        },
        border: {
          DEFAULT: "var(--color-border)",
          focus: "var(--color-border-focus)",
        },
        status: {
          success: "var(--color-success)",
          warning: "var(--color-warning)",
          error: "var(--color-error)",
          info: "var(--color-info)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
        editor: ["var(--font-editor)"],
      },
      fontSize: {
        "editor-xs": "var(--font-size-editor-xs)",
        "editor-sm": "var(--font-size-editor-sm)",
        "editor-base": "var(--font-size-editor-base)",
        "editor-lg": "var(--font-size-editor-lg)",
        "editor-xl": "var(--font-size-editor-xl)",
      },
      spacing: {
        sidebar: "var(--sidebar-width)",
      },
      zIndex: {
        sidebar: "100",
        panel: "200",
        modal: "300",
        toast: "400",
      },
    },
  },
  plugins: [],
};
