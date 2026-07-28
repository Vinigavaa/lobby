-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "hostId" TEXT NOT NULL,
    "selectedGameId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Room_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Room_selectedGameId_fkey" FOREIGN KEY ("selectedGameId") REFERENCES "Game" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Room" ("code", "createdAt", "hostId", "id", "status", "updatedAt")
SELECT "code", "createdAt", "hostId", "id", "status", "updatedAt" FROM "Room";
DROP TABLE "Room";
ALTER TABLE "new_Room" RENAME TO "Room";
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");
CREATE INDEX "Room_hostId_idx" ON "Room"("hostId");
CREATE INDEX "Room_selectedGameId_idx" ON "Room"("selectedGameId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Keep only Impostor available while the remaining catalog is shown as upcoming.
UPDATE "Game"
SET "isActive" = CASE WHEN "type" = 'impostor' THEN true ELSE false END
WHERE "type" IN (
    'impostor',
    'quem-sou-eu',
    'mimica',
    'stop',
    'trivia',
    'cidade-dorme'
);
