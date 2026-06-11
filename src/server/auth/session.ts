import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { getMobileUserId } from "@/server/auth/mobile";

export async function getCurrentUserId(request?: Request) {
  if (request) {
    const mobileUserId = await getMobileUserId(request);

    if (mobileUserId) {
      return mobileUserId;
    }
  }

  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function requireCurrentUserId(request?: Request) {
  const userId = await getCurrentUserId(request);

  if (!userId) {
    throw Object.assign(new Error("Authentication required"), { status: 401 });
  }

  return userId;
}
