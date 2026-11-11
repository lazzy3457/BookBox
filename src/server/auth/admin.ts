import { getSession } from "@/server/auth/session";
import { UserRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export function isAdminRole(role: string | null | undefined) {
  return role === UserRole.ADMIN;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user?.id) throw Object.assign(new Error("Accès réservé à la modération."), { status: 403, code: "ADMIN_REQUIRED" });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, emailVerified: true, suspendedAt: true } });
  if (!user || user.role !== UserRole.ADMIN || !user.emailVerified || user.suspendedAt) {
    throw Object.assign(new Error("Accès réservé à la modération."), { status: 403, code: "ADMIN_REQUIRED" });
  }
  return session.user;
}

// Même définition d'un admin que requireAdmin, pour un utilisateur déjà identifié.
export async function isActiveAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, emailVerified: true, suspendedAt: true } });
  return Boolean(user && user.role === UserRole.ADMIN && user.emailVerified && !user.suspendedAt);
}
