import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080", // Spring Boot Backend
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/ai"), // /api/stt -> /ai/stt
      },
      "/health": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});