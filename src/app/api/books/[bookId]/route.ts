import { NextResponse } from "next/server";
import { apiError, notFound } from "@/server/http/errors";
import { getBookDetails, setBookPageCount } from "@/server/services/books";
import { isActiveAdmin } from "@/server/auth/admin";
import { requireCurrentUserId } from "@/server/auth/session";
import { bookPageCountSchema } from "@/server/validation/books";

export async function GET(_: Request, { params }: { params: Promise<{ bookId: string }> }) {
  try {
    const { bookId } = await params;
    const book = await getBookDetails(bookId);

    if (!book) {
      throw notFound("Livre introuvable.", "BOOK_NOT_FOUND");
    }

    // Les bibliothèques des lecteurs restent côté serveur.
    const { libraries: _libraries, ...publicBook } = book;
    return NextResponse.json(publicBook);
  } catch (error) {
    return apiError(error);
  }
}

// Renseigne le nombre de pages d'un livre qui n'en a pas ; un admin peut aussi le corriger.
export async function PATCH(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  try {
    const userId = await requireCurrentUserId(request);
    const { bookId } = await params;
    const { pageCount } = bookPageCountSchema.parse(await request.json());

    const isAdmin = await isActiveAdmin(userId);

    return NextResponse.json(await setBookPageCount({ userId, bookId, pageCount, isAdmin }));
  } catch (error) {
    return apiError(error);
  }
}
