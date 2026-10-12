import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";

export function isAdminRole(role: string | null | undefined) {
  return role === UserRole.ADMIN;
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw Object.assign(new Error("Accès réservé à la modération."), { status: 403, code: "ADMIN_REQUIRED" });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, emailVerified: true, suspendedAt: true } });
  if (!user || user.role !== UserRole.ADMIN || !user.emailVerified || user.suspendedAt) {
    throw Object.assign(new Error("Accès réservé à la modération."), { status: 403, code: "ADMIN_REQUIRED" });
  }
  return session.user;
}
