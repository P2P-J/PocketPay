import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: [".js", ".jsx", ".json"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
    outDir: "build",
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      "/auth": "http://localhost:3000",
      "/deal": "http://localhost:3000",
      "/team": "http://localhost:3000",
      "/ocr": "http://localhost:3000",
    },
  },
});
