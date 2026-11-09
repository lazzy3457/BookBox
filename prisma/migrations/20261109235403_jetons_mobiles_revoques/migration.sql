-- CreateTable
CREATE TABLE "RevokedMobileToken" (
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevokedMobileToken_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE INDEX "RevokedMobileToken_expiresAt_idx" ON "RevokedMobileToken"("expiresAt");
