const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

module.exports = function injectEdgeProxyRoutes(ctx) {
  const { app } = ctx;

  // Edge browser proxy - remove X-Frame-Options to allow Google/YouTube in iframe
  app.get("/api/edge-proxy", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).json({ error: "URL não fornecida" });
    }

    try {
      const parsedUrl = new URL(targetUrl);
      const isAllowed =
        parsedUrl.hostname.includes("google") ||
        parsedUrl.hostname.includes("youtube");

      if (!isAllowed) {
        return res.status(403).json({ error: "Domínio não permitido" });
      }

      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
          Accept: req.headers["accept"] || "text/html,application/xhtml+xml",
        },
      });

      const headers = new Headers(response.headers);
      headers.delete("x-frame-options");
      headers.delete("X-Frame-Options");
      headers.delete("content-security-policy");
      headers.delete("Content-Security-Policy");

      res.set({
        "Content-Type": response.headers.get("Content-Type") || "text/html",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Frame-Options": "ALLOWALL",
      });

      const body = await response.text();
      res.send(body);
    } catch (err) {
      console.error("Edge proxy error:", err.message);
      res.status(502).json({ error: "Falha ao carregar a página" });
    }
  });
};
