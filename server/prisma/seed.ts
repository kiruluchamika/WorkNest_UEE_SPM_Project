import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/hash";

const prisma = new PrismaClient();

const DEMO_USERS = [
  {
    email: "amal@example.com",
    name: "Amal Perera",
    role: "jobseeker" as const,
    phone: "0771234567",
    bio: "Hard-working student looking for weekend retail and event gigs.",
    location: "Colombo 03",
    trustScore: 78,
  },
  {
    email: "savi@example.com",
    name: "Savithri Silva",
    role: "shopowner" as const,
    phone: "0712345678",
    bio: "Owner of Savi's Café & Bakeshop.",
    location: "Colombo 05",
    trustScore: 88,
  },
  {
    email: "nuwan@example.com",
    name: "Nuwan Dias",
    role: "verifier" as const,
    phone: "0761234567",
    bio: "Community leader and youth employment coordinator.",
    location: "Colombo 04",
    trustScore: 95,
  },
];

async function main() {
  const passwordHash = await hashPassword("password");

  for (const demoUser of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {},
      create: { ...demoUser, passwordHash },
    });
  }

  console.log(`Seeded ${DEMO_USERS.length} demo users (password: "password")`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
