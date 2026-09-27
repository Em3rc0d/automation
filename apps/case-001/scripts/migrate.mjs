import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required.");

const pool = new Pool({ connectionString });
const directory = path.resolve("supabase/migrations");
const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();

try {
  for (const file of files) {
    const sql = await readFile(path.join(directory, file), "utf8");
    process.stdout.write(`Applying ${file}... `);
    await pool.query(sql);
    console.log("ok");
  }
} finally {
  await pool.end();
}
