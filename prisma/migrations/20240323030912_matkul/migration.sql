/*
  Warnings:

  - Added the required column `mataKuliah` to the `PengajuanMagang` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PengajuanMagang" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mahasiswaId" INTEGER NOT NULL,
    "jenisMagang" TEXT NOT NULL,
    "nilaiMagang" TEXT,
    "mataKuliah" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "konsultasiPA" DATETIME,
    "rancangKRS" BOOLEAN,
    "learningAgreement" BOOLEAN,
    "validasiKaprodi" BOOLEAN,
    "validasiDekan" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PengajuanMagang_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PengajuanMagang" ("createdAt", "id", "jenisMagang", "konsultasiPA", "learningAgreement", "mahasiswaId", "rancangKRS", "status", "updatedAt", "validasiDekan", "validasiKaprodi") SELECT "createdAt", "id", "jenisMagang", "konsultasiPA", "learningAgreement", "mahasiswaId", "rancangKRS", "status", "updatedAt", "validasiDekan", "validasiKaprodi" FROM "PengajuanMagang";
DROP TABLE "PengajuanMagang";
ALTER TABLE "new_PengajuanMagang" RENAME TO "PengajuanMagang";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
