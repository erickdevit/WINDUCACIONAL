const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

module.exports = function injectNotificationsRoutes(ctx) {
  const { app, notificationClients, onlineUsers, requireAuth } = ctx;

  app.get("/api/notifications/events", requireAuth, async (req, res, next) => {
    try {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      if (!notificationClients.has(req.user.id)) {
        notificationClients.set(req.user.id, new Set());
      }
      notificationClients.get(req.user.id).add(res);
      if (!onlineUsers.has(req.user.id)) {
        onlineUsers.set(req.user.id, {
          user: req.user,
          clients: new Set(),
        });
      }
      const onlineUser = onlineUsers.get(req.user.id);
      onlineUser.user = req.user;
      onlineUser.clients.add(res);

      const heartbeat = setInterval(() => {
        res.write(": keep-alive\n\n");
      }, 25000);

      req.on("close", () => {
        clearInterval(heartbeat);
        const clients = notificationClients.get(req.user.id);
        if (clients) {
          clients.delete(res);
          if (clients.size === 0) notificationClients.delete(req.user.id);
        }
        const onlineUser = onlineUsers.get(req.user.id);
        if (onlineUser) {
          onlineUser.clients.delete(res);
          if (onlineUser.clients.size === 0) onlineUsers.delete(req.user.id);
        }
      });
    } catch (error) {
      next(error);
    }
  });
};
