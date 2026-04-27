import { VitePWA } from "vite-plugin-pwa";

export const pwaConfig = VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["favicon.ico"],

  manifest: {
    name: "Truck IT - Digital Ticketing",
    short_name: "Truck IT",
    description: "Digital ticketing system for logistics operations",
    theme_color: "#1e5ba8",
    background_color: "#f5f7fa",
    display: "standalone",
    orientation: "portrait",
    scope: "/",
    start_url: "/",
    icons: [
      {
        src: "/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  },

  workbox: {
    cleanupOutdatedCaches: true,
    skipWaiting: true,
    clientsClaim: true,

    // ⛔ Exclude large JS bundles from precache
    globPatterns: ["**/*.{css,html,ico,png,svg,woff2}"],
    globIgnores: ["**/assets/index-*.js"],

    runtimeCaching: [
      // ✅ Runtime cache for main JS bundle (Option 3)
      {
        urlPattern: /\/assets\/index-.*\.js$/,
        handler: "CacheFirst",
        options: {
          cacheName: "app-js-cache",
          expiration: {
            maxEntries: 5,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },

      // Google Fonts (unchanged)
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
});