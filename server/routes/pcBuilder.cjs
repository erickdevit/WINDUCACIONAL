const crypto = require("node:crypto");

const rulesPromise = import("../domain/pcBuilderRules.mjs");
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeBuildId = (value) => {
  const id = String(value || "").trim();
  if (!UUID_PATTERN.test(id)) {
    const error = new Error("Identificador de montagem inválido.");
    error.status = 400;
    throw error;
  }
  return id;
};

const normalizeBuildName = (value) => {
  const name = String(value || "")
    .trim()
    .replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 80) {
    const error = new Error(
      "O nome da montagem deve ter entre 1 e 80 caracteres."
    );
    error.status = 400;
    throw error;
  }
  return name;
};

const publicBuild = (row) => ({
  id: row.id,
  name: row.name,
  components: row.components || {},
  validation: row.validation || {},
  outcome: row.outcome,
  createdAt: row.created_at,
});

module.exports = function injectPcBuilderRoutes(ctx) {
  const { app, pool, requireAuth } = ctx;

  app.get("/api/pc-builder/builds", requireAuth, async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT id, name, components, validation, outcome, created_at
           FROM pc_builds
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 100`,
        [req.user.id]
      );
      res.json({ builds: result.rows.map(publicBuild) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/pc-builder/builds/:id", requireAuth, async (req, res, next) => {
    try {
      const buildId = normalizeBuildId(req.params.id);
      const result = await pool.query(
        `SELECT id, name, components, validation, outcome, created_at
           FROM pc_builds
          WHERE id = $1 AND user_id = $2`,
        [buildId, req.user.id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Montagem não encontrada." });
      }
      res.json({ build: publicBuild(result.rows[0]) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/pc-builder/builds", requireAuth, async (req, res, next) => {
    try {
      const name = normalizeBuildName(req.body?.name);
      const { sanitizePcSelection, validatePcBuild } = await rulesPromise;
      const sanitized = sanitizePcSelection(req.body?.components);
      if (sanitized.invalid.length > 0) {
        return res.status(400).json({ error: sanitized.invalid[0] });
      }

      const evaluation = validatePcBuild(sanitized.selection);
      const validation = {
        errors: evaluation.errors,
        warnings: evaluation.warnings,
        metrics: evaluation.metrics,
      };
      const id = crypto.randomUUID();
      const result = await pool.query(
        `INSERT INTO pc_builds
           (id, user_id, name, components, validation, outcome)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
         RETURNING id, name, components, validation, outcome, created_at`,
        [
          id,
          req.user.id,
          name,
          JSON.stringify(evaluation.selection),
          JSON.stringify(validation),
          evaluation.outcome,
        ]
      );
      res.status(201).json({ build: publicBuild(result.rows[0]) });
    } catch (error) {
      next(error);
    }
  });

  app.delete(
    "/api/pc-builder/builds/:id",
    requireAuth,
    async (req, res, next) => {
      try {
        const buildId = normalizeBuildId(req.params.id);
        const result = await pool.query(
          "DELETE FROM pc_builds WHERE id = $1 AND user_id = $2",
          [buildId, req.user.id]
        );
        if (result.rowCount === 0) {
          return res.status(404).json({ error: "Montagem não encontrada." });
        }
        res.status(204).end();
      } catch (error) {
        next(error);
      }
    }
  );
};

module.exports.validators = { normalizeBuildId, normalizeBuildName };
