import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import { pwaConfig } from "./vite-pwa.config";
import { apiPlugin } from "./vite-api-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Check if SSL certificates exist
  const certDir = path.resolve(__dirname, ".cert");
  const keyPath = path.join(certDir, "localhost-key.pem");
  const certPath = path.join(certDir, "localhost.pem");

  const hasSSL = fs.existsSync(keyPath) && fs.existsSync(certPath);

  // Log HTTPS status
  if (hasSSL) {
    console.log("🔒 HTTPS enabled - Server will run on https://localhost:8080");
  } else {
    console.log("⚠️  HTTP mode - Run 'npm run generate-cert' to enable HTTPS");
  }

  return {
    server: {
      host: "::",
      port: 8080,
      https: hasSSL
        ? {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
          }
        : undefined,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      mode === "development" && apiPlugin(),
      pwaConfig,
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
