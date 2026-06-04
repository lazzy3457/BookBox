import { NextResponse } from "next/server";
import { apiError } from "@/server/http/errors";
import { createManualBook, upsertGoogleBook } from "@/server/services/books";
import { googleBookUpsertSchema, manualBookSchema } from "@/server/validation/books";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const book = body.googleBooksVolumeId
      ? await upsertGoogleBook(googleBookUpsertSchema.parse(body))
      : await createManualBook(manualBookSchema.parse(body));

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
