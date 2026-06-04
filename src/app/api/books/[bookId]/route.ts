import { NextResponse } from "next/server";
import { apiError, notFound } from "@/server/http/errors";
import { getBookDetails } from "@/server/services/books";

export async function GET(_: Request, { params }: { params: Promise<{ bookId: string }> }) {
  try {
    const { bookId } = await params;
    const book = await getBookDetails(bookId);

    if (!book) {
      throw notFound("Livre introuvable.", "BOOK_NOT_FOUND");
    }

    return NextResponse.json(book);
  } catch (error) {
    return apiError(error);
  }
}
