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
  {
    email: "admin@worknest.dev",
    name: "WorkNest Admin",
    role: "admin" as const,
    phone: "0700000000",
    bio: "Platform administrator.",
    location: "Colombo",
    trustScore: 100,
  },
];

const DEFAULT_CATEGORIES = [
  { name: "Retail", description: "In-store sales and customer service roles." },
  { name: "Delivery", description: "Courier and delivery gigs." },
  { name: "Cleaning", description: "Residential and commercial cleaning work." },
  { name: "Hospitality", description: "Hotels, guest services, and front-of-house roles." },
  { name: "Event Staff", description: "Setup, ushering, and support for events." },
  { name: "Warehouse", description: "Picking, packing, and inventory work." },
  { name: "Office Support", description: "Administrative and clerical support tasks." },
  { name: "Food & Beverage", description: "Kitchen, service, and cafe work." },
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

  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
