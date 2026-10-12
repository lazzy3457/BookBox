import { randomUUID } from "crypto";
import { prisma } from "@/server/db/prisma";
import { notFound } from "@/server/http/errors";

export async function getBlockedUserIds(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ userId: string }>>`
    SELECT "blockedId" AS "userId" FROM "UserBlock" WHERE "blockerId" = ${userId}
    UNION
    SELECT "blockerId" AS "userId" FROM "UserBlock" WHERE "blockedId" = ${userId}
  `;
  return rows.map((row) => row.userId);
}

export async function areUsersBlocked(firstUserId: string, secondUserId: string) {
  if (firstUserId === secondUserId) return false;
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM "UserBlock"
      WHERE ("blockerId" = ${firstUserId} AND "blockedId" = ${secondUserId})
         OR ("blockerId" = ${secondUserId} AND "blockedId" = ${firstUserId})
    ) AS "exists"
  `;
  return rows[0]?.exists ?? false;
}

export async function assertUsersCanInteract(firstUserId: string, secondUserId: string) {
  if (await areUsersBlocked(firstUserId, secondUserId)) {
    throw Object.assign(new Error("Cette interaction n’est pas disponible."), {
      status: 403,
      code: "USER_BLOCKED"
    });
  }
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) {
    throw Object.assign(new Error("Tu ne peux pas te bloquer toi-même."), {
      status: 400,
      code: "SELF_BLOCK_FORBIDDEN"
    });
  }
  const target = await prisma.user.findUnique({ where: { id: blockedId }, select: { id: true } });
  if (!target) throw notFound("Utilisateur introuvable.", "USER_NOT_FOUND");
  const id = randomUUID();
  const now = new Date();
  await prisma.$transaction([
    prisma.$executeRaw`
      INSERT INTO "UserBlock" ("id", "blockerId", "blockedId", "createdAt")
      VALUES (${id}, ${blockerId}, ${blockedId}, ${now})
      ON CONFLICT ("blockerId", "blockedId") DO NOTHING
    `,
    prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: blockedId },
          { followerId: blockedId, followingId: blockerId }
        ]
      }
    })
  ]);
  return { blocked: true };
}

export async function unblockUser(blockerId: string, blockedId: string) {
  await prisma.$executeRaw`
    DELETE FROM "UserBlock" WHERE "blockerId" = ${blockerId} AND "blockedId" = ${blockedId}
  `;
  return { blocked: false };
}

export async function listBlockedUsers(blockerId: string) {
  return prisma.$queryRaw<Array<{
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    blockedAt: Date;
  }>>`
    SELECT u."id", u."name", u."username", u."image", b."createdAt" AS "blockedAt"
    FROM "UserBlock" b
    JOIN "User" u ON u."id" = b."blockedId"
    WHERE b."blockerId" = ${blockerId}
    ORDER BY b."createdAt" DESC
  `;
}
