import { NextResponse } from "next/server";
import { apiError } from "@/server/http/errors";
import { searchExternalBooks } from "@/server/services/externalSearch";
import { searchBooksSchema } from "@/server/validation/books";
import { enforceRateLimit, getClientIdentifier } from "@/server/security/rateLimit";

export async function GET(request: Request) {
  try {
    await enforceRateLimit({
      scope: "book-search",
      identifier: getClientIdentifier(request),
      limit: 60,
      windowMs: 60_000
    });
    const { searchParams } = new URL(request.url);
    const { q, startIndex, googleStart, openLibraryStart, pageSize, mode, language, source } = searchBooksSchema.parse({
      q: searchParams.get("q") ?? "",
      startIndex: searchParams.get("startIndex") ?? "0",
      googleStart: searchParams.get("googleStart") ?? undefined,
      openLibraryStart: searchParams.get("openLibraryStart") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? "10",
      mode: searchParams.get("mode") ?? "all",
      language: searchParams.get("language") ?? "all",
      source: searchParams.get("source") ?? "all"
    });
    // Un curseur par source. Sans eux (ancien client), `startIndex` est la
    // somme des deux curseurs renvoyée dans `nextStartIndex` : on la répartit.
    const legacyStart = source === "all" ? Math.ceil(startIndex / 2) : startIndex;
    const result = await searchExternalBooks({
      query: q,
      mode,
      language,
      source,
      pageSize,
      googleStart: googleStart ?? legacyStart,
      openLibraryStart: openLibraryStart ?? legacyStart,
      logLabel: "books/search"
    });

    return NextResponse.json({
      ...result,
      nextStartIndex: result.googleStart + result.openLibraryStart
    });
  } catch (error) {
    return apiError(error);
  }
}
