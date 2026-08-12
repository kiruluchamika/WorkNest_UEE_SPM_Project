import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/db";

async function main() {
  await prisma.$connect();
  console.log("Database connected successfully");

  app.listen(env.PORT, () => {
    console.log(`WorkNest API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
