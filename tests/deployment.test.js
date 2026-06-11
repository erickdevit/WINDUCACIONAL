import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function readRepoFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

function composeServiceBlock(compose, serviceName) {
  const normalized = `\n${compose}`;
  const match = normalized.match(
    new RegExp(`\\n  ${serviceName}:\\n[\\s\\S]*?(?=\\n  [a-zA-Z0-9_-]+:\\n|\\nvolumes:\\n|$)`)
  );
  return match?.[0] ?? "";
}

describe("Deploy Rails + React", () => {
  const compose = readRepoFile("docker-compose.rails.yml");
  const webService = composeServiceBlock(compose, "web");
  const railsService = composeServiceBlock(compose, "rails_api");
  const nginxConfig = readRepoFile("winducacional-web", "nginx.conf");
  const webDockerfile = readRepoFile("winducacional-web", "Dockerfile");

  it("publica somente o frontend novo no compose Rails", () => {
    expect(webService).toContain("context: ./winducacional-web");
    expect(webService).toContain('"${WEB_PORT:-8080}:80"');
    expect(webService).toContain("condition: service_healthy");

    expect(railsService).toContain("expose:");
    expect(railsService).toContain('"3002"');
    expect(railsService).not.toContain("ports:");
  });

  it("serve o build do Vite por Nginx com fallback de SPA", () => {
    expect(webDockerfile).toContain("FROM docker.io/library/node:20-alpine AS build");
    expect(webDockerfile).toContain("RUN npm ci");
    expect(webDockerfile).toContain("RUN npm run build");
    expect(webDockerfile).toContain("FROM docker.io/library/nginx:1.27-alpine AS runtime");
    expect(webDockerfile).toContain("COPY --from=build /app/dist /usr/share/nginx/html");

    expect(nginxConfig).toContain("try_files $uri $uri/ /index.html;");
  });

  it("proxy /api e /cable para o Rails interno", () => {
    expect(nginxConfig).toContain("location /api/");
    expect(nginxConfig).toContain("proxy_pass http://rails_api:3002;");
    expect(nginxConfig).toContain("location /cable");
    expect(nginxConfig).toContain("proxy_pass http://rails_api:3002/cable;");
    expect(nginxConfig).toContain("proxy_set_header Upgrade $http_upgrade;");
    expect(nginxConfig).toContain('proxy_set_header Connection "upgrade";');
  });
});
