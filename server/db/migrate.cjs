const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const migrationsDir = path.join(__dirname, "migrations");

// Chave fixa do advisory lock. Garante que apenas uma instância aplique
// migrations por vez, mesmo com várias réplicas subindo simultaneamente.
const MIGRATION_ADVISORY_LOCK_KEY = 727274;

const MIGRATION_FILE_PATTERN = /^\d{4}_[a-z0-9_]+\.sql$/i;

const checksumOf = (content) =>
  crypto.createHash("sha256").update(content, "utf8").digest("hex");

const listMigrationFiles = () => {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((file) => MIGRATION_FILE_PATTERN.test(file))
    .sort((a, b) => a.localeCompare(b, "en"));
};

const versionFromFile = (file) => file.replace(/\.sql$/i, "");

const ensureMigrationsTable = async (pool) => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       version TEXT PRIMARY KEY,
       checksum TEXT NOT NULL,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`
  );
};

const getAppliedMigrations = async (pool) => {
  const result = await pool.query(
    "SELECT version, checksum FROM schema_migrations"
  );
  const applied = new Map();
  for (const row of result.rows) {
    applied.set(row.version, row.checksum);
  }
  return applied;
};

// Executa as migrations pendentes em ordem. Cada arquivo roda dentro de uma
// transação própria e só é registrado em schema_migrations se aplicar com
// sucesso, mantendo o histórico íntegro mesmo após falhas parciais.
const runMigrations = async (pool, { logger = console } = {}) => {
  const files = listMigrationFiles();
  if (files.length === 0) {
    logger.warn("Nenhuma migration encontrada em server/db/migrations.");
    return { applied: [], skipped: [] };
  }

  const lockClient = await pool.connect();
  const applied = [];
  const skipped = [];
  try {
    await lockClient.query("SELECT pg_advisory_lock($1)", [
      MIGRATION_ADVISORY_LOCK_KEY,
    ]);
    await ensureMigrationsTable(pool);
    const alreadyApplied = await getAppliedMigrations(pool);

    for (const file of files) {
      const version = versionFromFile(file);
      const sql = await fs.promises.readFile(
        path.join(migrationsDir, file),
        "utf8"
      );
      const checksum = checksumOf(sql);

      if (alreadyApplied.has(version)) {
        if (alreadyApplied.get(version) !== checksum) {
          logger.warn(
            `Migration ${version} já aplicada com checksum diferente do arquivo atual. ` +
              "Edições em migrations aplicadas não são reexecutadas; crie uma nova migration."
          );
        }
        skipped.push(version);
        continue;
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)",
          [version, checksum]
        );
        await client.query("COMMIT");
        applied.push(version);
        logger.log(`Migration aplicada: ${version}`);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        logger.error(`Falha ao aplicar migration ${version}.`, error);
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await lockClient
      .query("SELECT pg_advisory_unlock($1)", [MIGRATION_ADVISORY_LOCK_KEY])
      .catch(() => {});
    lockClient.release();
  }

  return { applied, skipped };
};

module.exports = {
  runMigrations,
  listMigrationFiles,
  migrationsDir,
  MIGRATION_ADVISORY_LOCK_KEY,
};
