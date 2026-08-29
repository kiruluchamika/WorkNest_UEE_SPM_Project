import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";
import { neon } from "@neondatabase/serverless";
import { env } from "./env";

const adapter = new PrismaNeonHTTP(env.DATABASE_URL, {});

export const prisma = new PrismaClient({ adapter });
export const neonSql = neon(env.DATABASE_URL);
