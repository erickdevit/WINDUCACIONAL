const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

module.exports = function injectBookletsRoutes(ctx) {
  const {
    app,
    buildBookletCatalog,
    findBookletFile,
    getBookletCatalogWithAccess,
    listBookletStudentAccess,
    pool,
    publicBookletModule,
    requireAuth,
    requireProfessor,
  } = ctx;

  app.get("/api/booklets/modules", requireAuth, async (req, res, next) => {
    try {
      const modules = await getBookletCatalogWithAccess(req.user);
      const visibleModules =
        req.user.role !== "aluno"
          ? modules
          : modules.filter((module) => module.enabled);

      res.json({
        modules: visibleModules.map((module) => publicBookletModule(module)),
      });
    } catch (error) {
      next(error);
    }
  });

  app.put(
    "/api/booklets/modules/access",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const enabledModuleIds = Array.isArray(req.body.enabledModuleIds)
          ? req.body.enabledModuleIds.map((id) => String(id))
          : [];
        const modules = await buildBookletCatalog();
        const knownIds = new Set(modules.map((module) => module.id));
        const unknownId = enabledModuleIds.find((id) => !knownIds.has(id));

        if (unknownId) {
          return res
            .status(400)
            .json({ error: "Módulo de apostila inválido." });
        }

        const enabledSet = new Set(enabledModuleIds);
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          for (const module of modules) {
            await client.query(
              `INSERT INTO booklet_module_access (module_id, enabled, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (module_id)
             DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`,
              [module.id, enabledSet.has(module.id)]
            );
          }
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK").catch(() => {});
          throw error;
        } finally {
          client.release();
        }

        const updatedModules = await getBookletCatalogWithAccess();
        res.json({
          modules: updatedModules.map((module) => publicBookletModule(module)),
        });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    "/api/booklets/student-access",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const turmaId = String(req.query.turmaId || "");
        const students = await listBookletStudentAccess(turmaId);
        res.json({ students });
      } catch (error) {
        next(error);
      }
    }
  );

  app.put(
    "/api/booklets/student-access",
    requireAuth,
    requireProfessor,
    async (req, res, next) => {
      try {
        const userIds = Array.isArray(req.body.userIds)
          ? [...new Set(req.body.userIds.map((id) => String(id)))]
          : [];
        const moduleIds = Array.isArray(req.body.moduleIds)
          ? [...new Set(req.body.moduleIds.map((id) => String(id)))]
          : [];
        const turmaId = String(req.body.turmaId || "");

        if (userIds.length === 0) {
          return res
            .status(400)
            .json({ error: "Selecione pelo menos um aluno." });
        }

        const modules = await buildBookletCatalog();
        const knownIds = new Set(modules.map((module) => module.id));
        const unknownId = moduleIds.find((id) => !knownIds.has(id));
        if (unknownId) {
          return res
            .status(400)
            .json({ error: "Módulo de apostila inválido." });
        }

        const userResult = await pool.query(
          "SELECT id FROM users WHERE id = ANY($1) AND role = 'aluno' AND active = TRUE",
          [userIds]
        );
        if (userResult.rowCount !== userIds.length) {
          return res.status(400).json({ error: "Aluno inválido." });
        }

        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            "DELETE FROM booklet_student_module_access WHERE user_id = ANY($1)",
            [userIds]
          );

          for (const userId of userIds) {
            for (const moduleId of moduleIds) {
              await client.query(
                `INSERT INTO booklet_student_module_access
                 (module_id, user_id, enabled, created_at, updated_at)
               VALUES ($1, $2, TRUE, NOW(), NOW())
               ON CONFLICT (module_id, user_id)
               DO UPDATE SET enabled = TRUE, updated_at = NOW()`,
                [moduleId, userId]
              );
            }
          }
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK").catch(() => {});
          throw error;
        } finally {
          client.release();
        }

        const students = await listBookletStudentAccess(turmaId);
        res.json({ students });
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    "/api/booklets/modules/:moduleId/files/:fileId/pdf",
    requireAuth,
    async (req, res, next) => {
      try {
        const { module, file } = await findBookletFile(
          req.params.moduleId,
          req.params.fileId,
          req.user
        );

        if (!module || !file) {
          return res.status(404).json({ error: "Apostila não encontrada." });
        }

        if (req.user.role !== "professor" && !module.enabled) {
          return res.status(403).json({
            error: "Esta apostila ainda não foi liberada para alunos.",
          });
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "private, max-age=300");
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${file.fileName.replace(
            /"/g,
            ""
          )}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`
        );
        res.sendFile(file.absolutePath);
      } catch (error) {
        next(error);
      }
    }
  );

  // --- Endpoints de Gestão de Sessões ---
};
