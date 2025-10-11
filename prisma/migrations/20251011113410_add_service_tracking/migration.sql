-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Server" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'stopped',
    "transport" TEXT NOT NULL DEFAULT 'stdio',
    "runMode" TEXT NOT NULL DEFAULT 'gui',
    "port" INTEGER,
    "serviceInstalled" BOOLEAN NOT NULL DEFAULT false,
    "serviceName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Server" ("createdAt", "description", "id", "name", "port", "runMode", "status", "transport", "updatedAt") SELECT "createdAt", "description", "id", "name", "port", "runMode", "status", "transport", "updatedAt" FROM "Server";
DROP TABLE "Server";
ALTER TABLE "new_Server" RENAME TO "Server";
CREATE UNIQUE INDEX "Server_name_key" ON "Server"("name");
CREATE INDEX "Server_status_idx" ON "Server"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
