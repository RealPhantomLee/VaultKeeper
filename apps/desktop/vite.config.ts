import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@stores": path.resolve(__dirname, "./src/stores"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@types": path.resolve(__dirname, "./src/types"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@styles": path.resolve(__dirname, "./src/styles"),
      "@vaultkeeper/config": path.resolve(__dirname, "../../packages/config/src"),
      "@vaultkeeper/types": path.resolve(__dirname, "../../packages/types/src"),
      "@vaultkeeper/crypto": path.resolve(__dirname, "../../packages/crypto/src"),
      "@vaultkeeper/sync-protocol": path.resolve(__dirname, "../../packages/sync-protocol/src"),
    },
  },
  build: {
    target: ["es2021", "chrome100", "safari13"],
    outDir: "dist",
    emptyOutDir: true,
  },
});
