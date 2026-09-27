import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const pool = new Pool({ connectionString });
try {
  const sql = await readFile(path.resolve("fixtures/seed-staging.sql"), "utf8");
  await pool.query(sql);
  console.log("Synthetic CASE-001 PoC seed applied.");
} finally {
  await pool.end();
}
