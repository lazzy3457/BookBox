import { PrismaClient } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run admin:grant -- adresse@email.fr");
  process.exit(1);
}
const prisma = new PrismaClient();
try {
  const user = await prisma.user.update({ where: { email }, data: { role: "ADMIN" }, select: { id: true, email: true } });
  console.log(`Rôle administrateur accordé à ${user.email}.`);
} catch {
  console.error("Compte introuvable.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
