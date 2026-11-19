import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

export type DatabaseEnv = {
  DATABASE_URL: string;
};

type DrizzleDatabase = ReturnType<typeof drizzle>;
const databaseCache = new Map<string, DrizzleDatabase>();

export function getDb(env: DatabaseEnv): DrizzleDatabase {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to use the database");
  }

  const cached = databaseCache.get(env.DATABASE_URL);
  if (cached) return cached;

  const database = drizzle({ client: neon(env.DATABASE_URL) });
  databaseCache.set(env.DATABASE_URL, database);
  return database;
}

export type Database = DrizzleDatabase;
