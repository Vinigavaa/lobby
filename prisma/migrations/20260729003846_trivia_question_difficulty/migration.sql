-- AlterTable
ALTER TABLE "TriviaQuestion" ADD COLUMN     "difficulty" TEXT NOT NULL DEFAULT 'medium';

-- CreateIndex
CREATE INDEX "TriviaQuestion_difficulty_idx" ON "TriviaQuestion"("difficulty");
