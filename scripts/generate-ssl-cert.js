/**
 * Generate self-signed SSL certificate for local HTTPS development
 * This script creates SSL certificates in the .cert directory
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

console.log("🔐 Generating self-signed SSL certificate for localhost...");
console.log("");

try {
  // Generate self-signed certificate using OpenSSL
  // This works on Windows (with Git Bash), macOS, and Linux
  const command = `openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj "/CN=localhost" -keyout "${keyPath}" -out "${certPath}" -days 365`;

  execSync(command, { stdio: "inherit" });

  console.log("");
  console.log("✅ SSL certificates generated successfully!");
  console.log("");
  console.log("📁 Certificate files:");
  console.log(`   🔑 Private Key: ${keyPath}`);
  console.log(`   📜 Certificate: ${certPath}`);
  console.log("");
  console.log("⚠️  Note: This is a self-signed certificate.");
  console.log("   Your browser will show a security warning.");
  console.log('   Click "Advanced" → "Proceed to localhost" to continue.');
  console.log("");
  console.log("🚀 You can now run: npm run dev");
  console.log("   Your app will be available at: https://localhost:8080");
  console.log("");
} catch (error) {
  console.error("");
  console.error("❌ Error generating SSL certificate");
  console.error("");

  if (error.message.includes("openssl")) {
    console.error("OpenSSL is not installed or not in PATH.");
    console.error("");
    console.error("📥 Installation instructions:");
    console.error("");
    console.error("Windows:");
    console.error("  1. Install Git for Windows (includes OpenSSL)");
    console.error("     https://git-scm.com/download/win");
    console.error("  2. Or install OpenSSL directly:");
    console.error("     https://slproweb.com/products/Win32OpenSSL.html");
    console.error("");
    console.error("macOS:");
    console.error("  OpenSSL is pre-installed");
    console.error("  Or install via Homebrew: brew install openssl");
    console.error("");
    console.error("Linux:");
    console.error("  sudo apt-get install openssl  (Ubuntu/Debian)");
    console.error("  sudo yum install openssl      (CentOS/RHEL)");
    console.error("");
    console.error("Alternative: Use mkcert (easier)");
    console.error("  npm install -g mkcert");
    console.error("  mkcert create-ca");
    console.error("  mkcert create-cert");
  } else {
    console.error(error.message);
  }

  process.exit(1);
}
