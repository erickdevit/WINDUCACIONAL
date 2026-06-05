const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

module.exports = function injectFsRoutes(ctx) {
  const {
    app,
    buildVisibleTree,
    config,
    extractVisibleHomes,
    listUsers,
    loadUserConfig,
    requireAuth,
    saveUserConfig,
    writeUserHome,
  } = ctx;

  app.get("/api/fs/tree", requireAuth, async (req, res, next) => {
    try {
      const tree = await buildVisibleTree(req.user);
      res.json({ tree });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/fs/tree", requireAuth, async (req, res, next) => {
    try {
      const usersData = extractVisibleHomes(req.body.tree);
      if (!usersData)
        return res.status(400).json({ error: "Árvore de arquivos inválida." });

      if (req.user.role !== "aluno") {
        const users = await listUsers({ includeInactive: false });
        for (const user of users) {
          if (usersData[user.username]?.data) {
            await writeUserHome(user, usersData[user.username].data);
          }
        }
      } else {
        const ownHome = usersData[req.user.username];
        if (!ownHome?.data)
          return res.status(403).json({ error: "Disco do usuário ausente." });
        await writeUserHome(req.user, ownHome.data);
      }

      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // --- Endpoints de Configurações do Usuário ---

  app.get("/api/user/config", requireAuth, async (req, res, next) => {
    try {
      const config = await loadUserConfig(req.user.storage_key);
      res.json({ config: config || {} });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/user/config", requireAuth, async (req, res, next) => {
    try {
      const config = req.body.config;
      if (!config || typeof config !== "object") {
        return res.status(400).json({ error: "Configuração inválida." });
      }
      await saveUserConfig(req.user.storage_key, config);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  // --- Endpoints de Turmas ---
};
