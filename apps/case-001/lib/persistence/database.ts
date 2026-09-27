import { Pool, type PoolClient, type QueryResultRow } from "pg";

export type DatabaseExecutor = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
};

let pool: Pool | null = null;

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required for CASE-001 persistence.");
  return value;
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl(),
      max: Number(process.env.CASE001_DB_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}

export function persistenceBackend() {
  return "postgres" as const;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const result = await getPool().query<T>(text, params);
  return { rows: result.rows, rowCount: result.rowCount };
}

export async function withTransaction<T>(work: (database: DatabaseExecutor) => Promise<T>): Promise<T> {
  const client: PoolClient = await getPool().connect();
  try {
    await client.query("begin");
    const executor: DatabaseExecutor = {
      query: async <R extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) => {
        const result = await client.query<R>(text, params);
        return { rows: result.rows, rowCount: result.rowCount };
      },
    };
    const result = await work(executor);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function databaseHealth() {
  const result = await query<{ database_name: string; postgres_version: string }>(
    "select current_database() as database_name, current_setting('server_version') as postgres_version",
  );
  return result.rows[0] ?? null;
}

export async function closeDatabaseForTests() {
  if (!pool) return;
  const current = pool;
  pool = null;
  await current.end();
}
