/**
 * Generate SSL certificate using mkcert (easier and trusted by browsers)
 * This is an alternative to OpenSSL that creates locally-trusted certificates
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certDir = path.join(__dirname, "../.cert");
const keyPath = path.join(certDir, "localhost-key.pem");
const certPath = path.join(certDir, "localhost.pem");

// Create .cert directory if it doesn't exist
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
  console.log("✅ Created .cert directory");
}

// Check if certificates already exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log("✅ SSL certificates already exist!");
  console.log(`   Key: ${keyPath}`);
  console.log(`   Cert: ${certPath}`);
  process.exit(0);
}

console.log("🔐 Generating locally-trusted SSL certificate using mkcert...");
console.log("");

try {
  // Check if mkcert is installed
  try {
    execSync("mkcert -version", { stdio: "pipe" });
  } catch (error) {
    console.error("❌ mkcert is not installed");
    console.error("");
    console.error("📥 Install mkcert:");
    console.error("");
    console.error("Windows (using Chocolatey):");
    console.error("  choco install mkcert");
    console.error("");
    console.error("Windows (using Scoop):");
    console.error("  scoop bucket add extras");
    console.error("  scoop install mkcert");
    console.error("");
    console.error("macOS:");
    console.error("  brew install mkcert");
    console.error("  brew install nss  # for Firefox");
    console.error("");
    console.error("Linux:");
    console.error("  See: https://github.com/FiloSottile/mkcert#installation");
    console.error("");
    console.error("Or use the OpenSSL method instead:");
    console.error("  node scripts/generate-ssl-cert.js");
    console.error("");
    process.exit(1);
  }

  // Install local CA (only needs to be done once)
  console.log("📦 Installing local Certificate Authority...");
  execSync("mkcert -install", { stdio: "inherit" });
  console.log("");

  // Generate certificate for localhost
  console.log("🔑 Generating certificate for localhost...");
  execSync(
    `mkcert -key-file "${keyPath}" -cert-file "${certPath}" localhost 127.0.0.1 ::1`,
    {
      stdio: "inherit",
      cwd: certDir,
    }
  );

  console.log("");
  console.log("✅ SSL certificates generated successfully!");
  console.log("");
  console.log("📁 Certificate files:");
  console.log(`   🔑 Private Key: ${keyPath}`);
  console.log(`   📜 Certificate: ${certPath}`);
  console.log("");
  console.log("✨ These certificates are trusted by your browser!");
  console.log("   No security warnings will appear.");
  console.log("");
  console.log("🚀 You can now run: npm run dev");
  console.log("   Your app will be available at: https://localhost:8080");
  console.log("");
} catch (error) {
  console.error("");
  console.error("❌ Error generating SSL certificate");
  console.error(error.message);
  console.error("");
  console.error("Try the OpenSSL method instead:");
  console.error("  node scripts/generate-ssl-cert.js");
  console.error("");
  process.exit(1);
}
