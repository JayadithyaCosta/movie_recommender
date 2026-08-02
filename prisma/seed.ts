import { PrismaClient } from "@prisma/client";

/**
 * Demo data lives here. F-13 fills this in with a seeded user, a wizard
 * RecSession and five resolved Movie rows so the app is demo-able offline;
 * for now this only proves the target and the DB connection are wired.
 *
 * Keep it idempotent — `make seed` should be safe to run repeatedly.
 */
const prisma = new PrismaClient();

async function main() {
  const [users, movies] = await Promise.all([prisma.user.count(), prisma.movie.count()]);
  console.log(`Seed connected. users=${users} movies=${movies}`);
  console.log("No demo data yet — see F-13 in docs/FEATURES.md.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
