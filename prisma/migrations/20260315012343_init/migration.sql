-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'REVOKED');

-- CreateTable
CREATE TABLE "virtual_cards" (
    "id" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "maxLimit" DECIMAL(10,2) NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "cvv" TEXT NOT NULL,
    "status" "CardStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "virtual_cards_cardNumber_key" ON "virtual_cards"("cardNumber");
