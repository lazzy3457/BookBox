import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json([], { status: 200 });
  }

  const entries = await prisma.bookListEntry.findMany({
    where: {
      bookId,
      list: { userId: session.user.id },
    },
    select: { listId: true },
  });

  return NextResponse.json(entries.map((e) => e.listId));
}