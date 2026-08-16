import { PrismaClient } from "@prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { env } from "./env";

// Plain HTTPS fetch requests (port 443) instead of raw TCP (port 5432) or a
// persistent WebSocket. Avoids environments where the direct Postgres port
// is blocked, where a broken IPv6 route causes TCP connections to hang, and
// where WebSocket upgrades get dropped by network middleboxes — HTTPS is the
// one thing that reliably works everywhere. The app doesn't use interactive
// prisma.$transaction(), so the HTTP adapter's lack of session support is
// not a limitation here.
const adapter = new PrismaNeonHttp(env.DATABASE_URL, {});

export const prisma = new PrismaClient({ adapter });
