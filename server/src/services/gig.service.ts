import { prisma } from "../config/db";

// The Neon HTTP adapter doesn't support Prisma's interactive transactions,
// which Prisma uses internally whenever `include` is combined with
// `create`/`update`. So writes never use `include` — instead we do the
// write, then a separate plain read to fetch the enriched shape.
export async function fetchGigWithCategory(id: string) {
  return prisma.gigPost.findUniqueOrThrow({ where: { id }, include: { category: true } });
}
