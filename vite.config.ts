import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "MagicLumosity",
        short_name: "MagicLumosity",
        description: "Ejercicios cerebrales rápidos para móvil",
        theme_color: "#0c1222",
        background_color: "#0c1222",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"]
      }
    })
  ],
  base: "./"
});
