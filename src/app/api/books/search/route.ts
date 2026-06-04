import { NextResponse } from "next/server";
import { apiError } from "@/server/http/errors";
import { searchGoogleBooks } from "@/server/services/googleBooks";
import { searchBooksSchema } from "@/server/validation/books";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { q } = searchBooksSchema.parse({ q: searchParams.get("q") ?? "" });
    const items = await searchGoogleBooks(q);

    return NextResponse.json({ items });
  } catch (error) {
    return apiError(error);
  }
}
