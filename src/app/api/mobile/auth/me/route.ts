import { NextResponse } from "next/server";
import { getMobileUserId } from "@/server/auth/mobile";
import { prisma } from "@/server/db/prisma";
import { apiError } from "@/server/http/errors";

export async function GET(request: Request) {
  try {
    const userId = await getMobileUserId(request);

    if (!userId) {
      throw Object.assign(new Error("Authentication required"), { status: 401, code: "UNAUTHORIZED" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        bio: true
      }
    });

    if (!user) {
      throw Object.assign(new Error("Utilisateur introuvable."), { status: 401, code: "USER_NOT_FOUND" });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return apiError(error);
  }
}
