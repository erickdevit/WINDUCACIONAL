import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const config = ({ mode }) => {
  return defineConfig({
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "favicon.png", "img/**/*", "font/**/*"],
        manifest: false, // Use existing public/manifest.json
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,woff,woff2,ttf}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    base: "",
    define: {
      "process.env.NODE_ENV": `"${mode}"`,
    },
    build: {
      outDir: "build",
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            return "vendor";
          },
        },
      },
    },
    server: {
      proxy: {
        "/api": "http://localhost:3001",
      },
    },
  });
};

export default config;
