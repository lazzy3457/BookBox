import { NextResponse } from "next/server";
import { apiError } from "@/server/http/errors";
import { createManualBook, upsertExternalBook } from "@/server/services/books";
import { externalBookUpsertSchema, manualBookSchema } from "@/server/validation/books";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const book = body.googleBooksVolumeId || body.openLibraryKey || body.source
      ? await upsertExternalBook(externalBookUpsertSchema.parse(body))
      : await createManualBook(manualBookSchema.parse(body));

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
