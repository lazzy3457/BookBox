import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;
  const userId = await getCurrentUserId(request);

  if (!userId) {
    return NextResponse.json([], { status: 200 });
  }

  const entries = await prisma.bookListEntry.findMany({
    where: {
      bookId,
      list: { userId },
    },
    select: { listId: true },
  });

  return NextResponse.json(entries.map((e) => e.listId));
}
