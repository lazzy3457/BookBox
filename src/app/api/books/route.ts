import { NextResponse } from "next/server";
import { apiError } from "@/server/http/errors";
import { createManualBook, upsertExternalBook } from "@/server/services/books";
import { externalBookUpsertSchema, manualBookSchema } from "@/server/validation/books";
import { requireCurrentUserId } from "@/server/auth/session";
import { enforceRateLimit } from "@/server/security/rateLimit";

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId(request);
    await enforceRateLimit({
      scope: "book-create",
      identifier: userId,
      limit: 30,
      windowMs: 60 * 60_000
    });
    const body = await request.json();
    const book = body.googleBooksVolumeId || body.openLibraryKey || body.source
      ? await upsertExternalBook(externalBookUpsertSchema.parse(body))
      : await createManualBook(manualBookSchema.parse(body));

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
