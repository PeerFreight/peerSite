import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: {
    // Only needed for drizzle-kit commands that touch a live database
    // (migrate/push/studio); `generate` works offline.
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/portal",
  },
});
