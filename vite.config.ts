import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // import.meta.url rather than __dirname: this config is loaded as ESM.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { port: 5173, host: true },
  build: {
    target: "es2020",
    // Splitting the vendor bundle keeps the first paint small on 3G.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          supabase: ["@supabase/supabase-js"],
          router: ["@tanstack/react-router", "@tanstack/react-query"],
        },
      },
    },
  },
});
