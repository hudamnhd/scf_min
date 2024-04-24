/*
  Warnings:

  - You are about to alter the column `status` on the `PengajuanMagang` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PengajuanMagang" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mahasiswaId" INTEGER NOT NULL,
    "jenisMagang" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "konsultasiPA" DATETIME NOT NULL,
    "rancangKRS" BOOLEAN NOT NULL,
    "learningAgreement" BOOLEAN NOT NULL,
    "validasiKaprodi" BOOLEAN NOT NULL,
    "validasiDekan" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PengajuanMagang_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PengajuanMagang" ("createdAt", "id", "jenisMagang", "konsultasiPA", "learningAgreement", "mahasiswaId", "rancangKRS", "status", "updatedAt", "validasiDekan", "validasiKaprodi") SELECT "createdAt", "id", "jenisMagang", "konsultasiPA", "learningAgreement", "mahasiswaId", "rancangKRS", "status", "updatedAt", "validasiDekan", "validasiKaprodi" FROM "PengajuanMagang";
DROP TABLE "PengajuanMagang";
ALTER TABLE "new_PengajuanMagang" RENAME TO "PengajuanMagang";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
