import type { Plugin } from "vite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });

/**
 * Vite plugin to handle API routes during development
 * This mimics Vercel serverless functions for local development
 */
export function apiPlugin(): Plugin {
  return {
    name: "vite-api-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Only handle /api/send-email route
        if (req.url === "/api/send-email" && req.method === "POST") {
          let body = "";

          req.on("data", (chunk) => {
            body += chunk.toString();
          });

          req.on("end", async () => {
            try {
              const { to, subject, html, from } = JSON.parse(body);

              // Validate required fields
              if (!to || !subject || !html) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: false,
                    error: "Missing required fields: to, subject, html",
                  })
                );
                return;
              }

              // Get API key from environment
              const apiKey = process.env.RESEND_API_KEY;
              if (!apiKey) {
                console.error("❌ RESEND_API_KEY not configured");
                console.error(
                  "Available env vars:",
                  Object.keys(process.env).filter((k) => k.includes("RESEND"))
                );
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: false,
                    error:
                      "RESEND_API_KEY not configured. Please check your .env file.",
                  })
                );
                return;
              }

              const fromEmail =
                from ||
                process.env.EMAIL_FROM ||
                "onboarding@avensis-logflow.com";

              console.log(`📧 Sending email to: ${to}`);
              console.log(`📝 Subject: ${subject}`);

              // Call Resend API
              const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: fromEmail,
                  to: [to],
                  subject,
                  html,
                }),
              });

              const data = await response.json();

              if (!response.ok) {
                console.error("❌ Resend API error:", data);
                res.statusCode = response.status;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: false,
                    error:
                      data.message ||
                      `Failed to send email: ${response.status}`,
                  })
                );
                return;
              }

              console.log("✅ Email sent successfully! Message ID:", data.id);

              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: true,
                  messageId: data.id,
                })
              );
            } catch (error: any) {
              console.error("❌ Error in API handler:", error);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: false,
                  error: error.message || "Internal server error",
                })
              );
            }
          });
        } else {
          next();
        }
      });
    },
  };
}
