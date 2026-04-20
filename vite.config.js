import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite 5 — minimal config (no tailwind; project uses plain CSS)
export default defineConfig({
  plugins: [react()],
  server: { host: "::", port: 8080 },
});
