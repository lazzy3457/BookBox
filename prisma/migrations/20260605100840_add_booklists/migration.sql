-- CreateTable
CREATE TABLE "BookList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rating" DOUBLE PRECISION,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookListEntry" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "note" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookList_userId_idx" ON "BookList"("userId");

-- CreateIndex
CREATE INDEX "BookListEntry_listId_idx" ON "BookListEntry"("listId");

-- CreateIndex
CREATE UNIQUE INDEX "BookListEntry_listId_bookId_key" ON "BookListEntry"("listId", "bookId");

-- AddForeignKey
ALTER TABLE "BookList" ADD CONSTRAINT "BookList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookListEntry" ADD CONSTRAINT "BookListEntry_listId_fkey" FOREIGN KEY ("listId") REFERENCES "BookList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookListEntry" ADD CONSTRAINT "BookListEntry_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
