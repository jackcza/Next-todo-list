// Usage: npm run points:sync
// Recomputes every user's rank points from their tasks (10 per task that has a completion time).
import "dotenv/config";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
await client.connect();
try {
  const { rowCount } = await client.query(`
    UPDATE "User" u
    SET "points" = 10 * (SELECT COUNT(*) FROM "Todo" t WHERE t."userId" = u."id" AND t."doneAt" IS NOT NULL)
  `);
  console.log(`Recomputed points for ${rowCount} users.`);
} finally {
  await client.end();
}
