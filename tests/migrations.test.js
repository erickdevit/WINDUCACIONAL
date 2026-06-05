import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const migrationsDir = path.resolve(__dirname, "../server/db/migrations");
const migratePath = path.resolve(__dirname, "../server/db/migrate.cjs");
const serverCode = fs.readFileSync(
  path.resolve(__dirname, "../server/index.cjs"),
  "utf8"
);

describe("Migrations - estrutura", () => {
  it("deve manter a baseline 0001 na pasta de migrations", () => {
    const baseline = path.join(migrationsDir, "0001_baseline.sql");
    expect(fs.existsSync(baseline)).toBe(true);
    const sql = fs.readFileSync(baseline, "utf8");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS turmas");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS users");
  });

  it("não deve mais aplicar schema.sql diretamente no boot", () => {
    expect(fs.existsSync(path.resolve(__dirname, "../server/db/schema.sql"))).toBe(
      false
    );
    expect(serverCode).toContain("runMigrations(pool)");
    expect(serverCode).not.toContain("await pool.query(schema)");
  });

  it("deve nomear migrations no padrão NNNN_descricao.sql", () => {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/i);
    }
  });
});

describe("Migrations - runner", () => {
  const migrate = require(migratePath);

  it("deve exportar runMigrations e a chave do advisory lock", () => {
    expect(typeof migrate.runMigrations).toBe("function");
    expect(typeof migrate.MIGRATION_ADVISORY_LOCK_KEY).toBe("number");
  });

  it("deve listar as migrations em ordem lexicográfica", () => {
    const files = migrate.listMigrationFiles();
    expect(files[0]).toBe("0001_baseline.sql");
    const sorted = [...files].sort((a, b) => a.localeCompare(b, "en"));
    expect(files).toEqual(sorted);
  });

  it("deve usar schema_migrations e pg_advisory_lock", () => {
    const runnerCode = fs.readFileSync(migratePath, "utf8");
    expect(runnerCode).toContain("CREATE TABLE IF NOT EXISTS schema_migrations");
    expect(runnerCode).toContain("pg_advisory_lock");
    expect(runnerCode).toContain("pg_advisory_unlock");
    expect(runnerCode).toContain("BEGIN");
    expect(runnerCode).toContain("ROLLBACK");
  });
});
