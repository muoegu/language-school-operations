import "../config/load-env.js";

import { sql } from "drizzle-orm";

import { getDb } from "./client.js";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is required to reset the schema");
}

const db = getDb({ DATABASE_URL: databaseUrl });

// This command is intentionally destructive and is for disposable demo data only.
await db.execute(sql`drop schema if exists public cascade`);
await db.execute(sql`create schema public`);

console.log("Dropped and recreated the public schema");
