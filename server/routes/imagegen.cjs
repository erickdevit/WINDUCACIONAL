// Geração de imagens via API própria (Cloudflare Worker). O token fica em
// variável de ambiente NO SERVIDOR (IMAGEGEN_API_TOKEN) e a geração passa por
// proxy aqui — o token nunca é enviado ao navegador. O registro de provedores
// abaixo mantém a arquitetura extensível para futuros backends.

const REQUEST_TIMEOUT = 90_000;
const DEFAULT_CLOUDFLARE_URL = "https://dawn-block-b032.wx-f24.workers.dev/";

// Proporção -> dimensões
const ASPECTS = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
  "4:3": { width: 1152, height: 864 },
  "3:4": { width: 864, height: 1152 },
};

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// ── Registro de provedores (extensível) ─────────────────────────────
const PROVIDERS = {
  cloudflare: {
    label: "Gerador interno",
    isConfigured: () => !!process.env.IMAGEGEN_API_TOKEN,
    generate: async ({ prompt, width, height }) => {
      const url = process.env.IMAGEGEN_API_URL || DEFAULT_CLOUDFLARE_URL;
      const token = process.env.IMAGEGEN_API_TOKEN;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, width, height }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!res.ok) {
        let detail = "";
        try {
          detail = (await res.text()).slice(0, 500);
        } catch {
          /* corpo ilegível */
        }
        console.error(
          `[imagegen] provider error ${res.status} ${res.statusText} :: ${detail}`
        );
        if (res.status === 401) {
          throw httpError(
            500,
            "Token de geração inválido ou ausente no servidor."
          );
        }
        if (res.status === 400) {
          throw httpError(
            400,
            "Requisição inválida para o gerador de imagens."
          );
        }
        throw httpError(
          502,
          "Falha interna ao gerar a imagem. Tente novamente."
        );
      }

      const contentType = res.headers.get("content-type") || "image/png";
      const buffer = Buffer.from(await res.arrayBuffer());
      if (!buffer.length) throw httpError(502, "O gerador retornou vazio.");
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    },
  },
};

const ACTIVE_PROVIDER = process.env.IMAGEGEN_PROVIDER || "cloudflare";

module.exports = function injectImagegenRoutes(ctx) {
  const { app, requireAuth } = ctx;

  const getProvider = () => PROVIDERS[ACTIVE_PROVIDER] || null;

  // Status público (qualquer usuário autenticado) — sem segredos
  app.get("/api/imagegen/config", requireAuth, (req, res) => {
    const provider = getProvider();
    res.json({
      provider: ACTIVE_PROVIDER,
      label: provider?.label || ACTIVE_PROVIDER,
      configured: !!provider && provider.isConfigured(),
    });
  });

  // Gerar imagem (qualquer usuário autenticado)
  app.post("/api/imagegen/generate", requireAuth, async (req, res, next) => {
    const provider = getProvider();
    if (!provider || !provider.isConfigured()) {
      return res.status(409).json({
        error: "O gerador de imagens não está configurado no servidor.",
      });
    }

    const prompt = String(req.body?.prompt || "").trim();
    if (!prompt) {
      return res.status(400).json({ error: "Descreva a imagem." });
    }

    const aspect = ASPECTS[req.body?.aspect] ? req.body.aspect : "1:1";
    const { width, height } = ASPECTS[aspect];

    try {
      const image = await provider.generate({ prompt, width, height });
      res.json({ image });
    } catch (error) {
      if (error.name === "TimeoutError") {
        console.error("[imagegen] generation timeout");
        return res
          .status(504)
          .json({
            error: "Tempo esgotado ao gerar a imagem. Tente novamente.",
          });
      }
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("[imagegen] unexpected error", error);
      return next(error);
    }
  });
};
