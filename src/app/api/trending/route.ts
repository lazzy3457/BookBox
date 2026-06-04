import { NextResponse } from "next/server";
import { apiError } from "@/server/http/errors";
import { getTrendingBooks } from "@/server/services/trending";

export async function GET() {
  try {
    const items = await getTrendingBooks();

    return NextResponse.json({ items });
  } catch (error) {
    return apiError(error);
  }
}
