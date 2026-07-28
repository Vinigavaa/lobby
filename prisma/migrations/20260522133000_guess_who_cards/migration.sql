-- CreateTable
CREATE TABLE "GuessWhoCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "GuessWhoCard_category_value_key" ON "GuessWhoCard"("category", "value");

-- CreateIndex
CREATE INDEX "GuessWhoCard_category_idx" ON "GuessWhoCard"("category");

-- CreateIndex
CREATE INDEX "GuessWhoCard_isActive_idx" ON "GuessWhoCard"("isActive");
