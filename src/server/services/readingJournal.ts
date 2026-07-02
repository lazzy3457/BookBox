import { ReadingStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function updateLibraryStatus(userId: string, bookId: string, status: ReadingStatus) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.userBook.upsert({
      where: { userId_bookId: { userId, bookId } },
      update: { status },
      create: { userId, bookId, status }
    });

    if (status === ReadingStatus.READING) {
      const openPeriod = await tx.readingPeriod.findFirst({
        where: { userBookId: item.id, finishedAt: null },
        orderBy: { createdAt: "desc" }
      });

      if (!openPeriod) {
        const previousCount = await tx.readingPeriod.count({ where: { userBookId: item.id } });
        await tx.readingPeriod.create({
          data: { userBookId: item.id, startedAt: startOfToday(), isReread: previousCount > 0 }
        });
      } else if (!openPeriod.startedAt) {
        await tx.readingPeriod.update({ where: { id: openPeriod.id }, data: { startedAt: startOfToday() } });
      }
    }

    if (status === ReadingStatus.READ) {
      const latest = await tx.readingPeriod.findFirst({
        where: { userBookId: item.id },
        orderBy: { createdAt: "desc" }
      });
      if (latest) {
        await tx.readingPeriod.update({
          where: { id: latest.id },
          data: { startedAt: latest.startedAt ?? startOfToday(), finishedAt: latest.finishedAt ?? startOfToday() }
        });
      } else {
        await tx.readingPeriod.create({
          data: { userBookId: item.id, startedAt: startOfToday(), finishedAt: startOfToday() }
        });
      }
    }

    return tx.userBook.findUniqueOrThrow({
      where: { id: item.id },
      include: { book: true, readingPeriods: { include: { entries: true } } }
    });
  });
}
