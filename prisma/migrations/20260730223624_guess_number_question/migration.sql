-- CreateTable
CREATE TABLE "GuessNumberQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "correctValue" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "emoji" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuessNumberQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuessNumberQuestion_question_key" ON "GuessNumberQuestion"("question");

-- CreateIndex
CREATE INDEX "GuessNumberQuestion_isActive_idx" ON "GuessNumberQuestion"("isActive");
