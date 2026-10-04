import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct connection; Neon's pooled (-pooler) host can't run them reliably.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
