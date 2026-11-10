// Ménage périodique de la base (à planifier, par exemple une fois par jour) :
//   npm run db:cleanup                 compteurs de débit et jetons expirés, vieilles notifications lues
//   npm run db:cleanup -- --unverified supprime aussi les comptes jamais vérifiés depuis plus de 7 jours
import { PrismaClient } from "@prisma/client";

const DAY = 86_400_000;
const prisma = new PrismaClient();
const now = new Date();

try {
  const [buckets, tokens, notifications, revoked] = await Promise.all([
    prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: now } } }),
    prisma.accountToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.notification.deleteMany({ where: { readAt: { lt: new Date(now.getTime() - 90 * DAY) } } }),
    prisma.revokedMobileToken.deleteMany({ where: { expiresAt: { lt: now } } })
  ]);
  console.log(`Compteurs de débit expirés : ${buckets.count}`);
  console.log(`Jetons de compte expirés : ${tokens.count}`);
  console.log(`Notifications lues depuis plus de 90 jours : ${notifications.count}`);
  console.log(`Jetons mobiles révoqués et expirés : ${revoked.count}`);

  if (process.argv.includes("--unverified")) {
    // Un compte sans e-mail vérifié ne peut pas se connecter : il n'a donc aucun contenu.
    const accounts = await prisma.user.deleteMany({
      where: { emailVerified: null, createdAt: { lt: new Date(now.getTime() - 7 * DAY) } }
    });
    console.log(`Comptes jamais vérifiés depuis plus de 7 jours : ${accounts.count}`);
  }
} finally {
  await prisma.$disconnect();
}
