import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@app": path.resolve(__dirname, "./src/app"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@widgets": path.resolve(__dirname, "./src/widgets"),
      "@features": path.resolve(__dirname, "./src/features"),
      "@entities": path.resolve(__dirname, "./src/entities"),
      "@shared": path.resolve(__dirname, "./src/shared"),
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
      "/deals": "http://localhost:3000",
      "/teams": "http://localhost:3000",
      "/ocr": "http://localhost:3000",
      "/account": "http://localhost:3000",
    },
  },
});
