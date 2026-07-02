import { requireCurrentUserId } from "@/server/auth/session";
import { apiError } from "@/server/http/errors";
import { enforceRateLimit } from "@/server/security/rateLimit";
import { buildAccountExport } from "@/server/services/accountData";

export async function GET(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({
      scope: "account-export",
      identifier: userId,
      limit: 3,
      windowMs: 60 * 60_000
    });
    const data = await buildAccountExport(userId);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="booksbox-export-${date}.json"`,
        "Cache-Control": "private, no-store, max-age=0"
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
