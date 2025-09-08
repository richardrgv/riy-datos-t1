import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 1423,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: ['283f23f27aed.ngrok-free.app'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // No es necesario un rewrite si las rutas de tu backend ya están bajo /api
        // Si tienes problemas de enrutamiento en tu frontend, aquí se configura:
        // rewrite: (path) => path, // o path.replace(/^\/api/, '') si es necesario
      }
    }
  },
});
