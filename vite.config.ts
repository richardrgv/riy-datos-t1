import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";



// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1423, // por defecto era 1420
    strictPort: true,
    // This is the key change to handle client-side routing
    historyApiFallback: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    envDir: '.', // This assumes the .env file is in the same directory as vite.config.ts
    // This is the key line
    envPrefix: ['VITE_', 'VITE_REACT_APP_'],
    /* --- NEW PROXY CONFIGURATION ---
    proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '/api'),
    },
  },
    */ 
  },
}));
