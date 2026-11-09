import { PrismaClient } from "@prisma/client";

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Le hash du mot de passe ne sort d'une requête que si elle le sélectionne explicitement :
    // une inclusion du compte entier oubliée dans une requête ne peut plus l'exposer.
    omit: { user: { passwordHash: true } }
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
