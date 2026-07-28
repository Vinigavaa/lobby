-- CreateTable
CREATE TABLE "MimicaWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "MimicaWord_category_idx" ON "MimicaWord"("category");

-- CreateIndex
CREATE INDEX "MimicaWord_isActive_idx" ON "MimicaWord"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MimicaWord_category_value_key" ON "MimicaWord"("category", "value");
