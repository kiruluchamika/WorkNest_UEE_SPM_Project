import dns from "dns";
import net from "net";
import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/db";

// Prefer IPv4 when resolving hosts: some networks advertise IPv6 routes to
// Neon that don't actually work, causing connections to hang and time out
// before Node falls back to the working IPv4 address. Node's fetch() (used
// by the Neon HTTP driver) races IPv4/IPv6 in parallel ("Happy Eyeballs")
// regardless of DNS order, so autoSelectFamily must also be disabled or a
// dead IPv6 candidate can still stall/fail the whole race.
dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);

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
