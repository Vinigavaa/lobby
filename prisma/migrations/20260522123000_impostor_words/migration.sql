-- CreateTable
CREATE TABLE "ImpostorWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ImpostorWord_category_value_key" ON "ImpostorWord"("category", "value");

-- CreateIndex
CREATE INDEX "ImpostorWord_category_idx" ON "ImpostorWord"("category");

-- CreateIndex
CREATE INDEX "ImpostorWord_isActive_idx" ON "ImpostorWord"("isActive");
