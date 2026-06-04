import { NextResponse } from "next/server";
import { apiError } from "@/server/http/errors";
import { GOOGLE_BOOKS_PAGE_SIZE, searchGoogleBooks } from "@/server/services/googleBooks";
import { searchBooksSchema } from "@/server/validation/books";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { q, startIndex } = searchBooksSchema.parse({
      q: searchParams.get("q") ?? "",
      startIndex: searchParams.get("startIndex") ?? "0"
    });
    const result = await searchGoogleBooks(q, startIndex);

    return NextResponse.json({
      ...result,
      pageSize: GOOGLE_BOOKS_PAGE_SIZE
    });
  } catch (error) {
    return apiError(error);
  }
}
