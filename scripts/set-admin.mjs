// Usage: npm run admin:grant -- <email>    |    npm run admin:revoke -- <email>
// The account must already exist (sign up in the app first).
import "dotenv/config";
import pg from "pg";

const [mode, rawEmail] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();
if (!["grant", "revoke"].includes(mode) || !email) {
  console.error("Usage: node scripts/set-admin.mjs <grant|revoke> <email>");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
await client.connect();
try {
  const role = mode === "grant" ? "admin" : "user";
  const { rowCount } = await client.query(`UPDATE "User" SET "role" = $1 WHERE "email" = $2`, [role, email]);
  if (rowCount === 0) {
    console.error(`No user found with email ${email}. Sign up in the app first.`);
    process.exitCode = 1;
  } else {
    console.log(`${email} is now ${role === "admin" ? "an admin" : "a regular user"}.`);
  }
} finally {
  await client.end();
}
