import { execSync } from "node:child_process";

const attempts = Number(process.env.MIGRATE_ATTEMPTS || 5);
const delayMs = Number(process.env.MIGRATE_DELAY_MS || 5000);

for (let i = 1; i <= attempts; i++) {
  try {
    console.log(`[migrate] attempt ${i}/${attempts}`);
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("[migrate] done");
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[migrate] attempt ${i} failed: ${message}`);
    if (i < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

console.error("[migrate] all attempts failed");
process.exit(1);