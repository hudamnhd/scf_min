/*
  Warnings:

  - The primary key for the `PengajuanMagang` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LaporanMagang" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pengajuanId" TEXT NOT NULL,
    "isiLaporan" TEXT NOT NULL,
    "fileLaporan" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LaporanMagang_pengajuanId_fkey" FOREIGN KEY ("pengajuanId") REFERENCES "PengajuanMagang" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LaporanMagang" ("createdAt", "fileLaporan", "id", "isiLaporan", "pengajuanId", "updatedAt") SELECT "createdAt", "fileLaporan", "id", "isiLaporan", "pengajuanId", "updatedAt" FROM "LaporanMagang";
DROP TABLE "LaporanMagang";
ALTER TABLE "new_LaporanMagang" RENAME TO "LaporanMagang";
CREATE TABLE "new_SidangMagang" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pengajuanId" TEXT NOT NULL,
    "tanggalSidang" DATETIME NOT NULL,
    "nilai" REAL NOT NULL,
    "catatan" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SidangMagang_pengajuanId_fkey" FOREIGN KEY ("pengajuanId") REFERENCES "PengajuanMagang" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SidangMagang" ("catatan", "createdAt", "id", "nilai", "pengajuanId", "tanggalSidang", "updatedAt") SELECT "catatan", "createdAt", "id", "nilai", "pengajuanId", "tanggalSidang", "updatedAt" FROM "SidangMagang";
DROP TABLE "SidangMagang";
ALTER TABLE "new_SidangMagang" RENAME TO "SidangMagang";
CREATE TABLE "new_PengajuanMagang" (
    "id" TEXT NOT NULL,
    "mahasiswaId" TEXT NOT NULL,
    "jenisMagang" TEXT NOT NULL,
    "nilaiMagang" TEXT,
    "mataKuliah" TEXT NOT NULL,
    "codeKuliah" TEXT NOT NULL,
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
INSERT INTO "new_PengajuanMagang" ("codeKuliah", "createdAt", "id", "jenisMagang", "konsultasiPA", "learningAgreement", "mahasiswaId", "mataKuliah", "nilaiMagang", "rancangKRS", "status", "updatedAt", "validasiDekan", "validasiKaprodi") SELECT "codeKuliah", "createdAt", "id", "jenisMagang", "konsultasiPA", "learningAgreement", "mahasiswaId", "mataKuliah", "nilaiMagang", "rancangKRS", "status", "updatedAt", "validasiDekan", "validasiKaprodi" FROM "PengajuanMagang";
DROP TABLE "PengajuanMagang";
ALTER TABLE "new_PengajuanMagang" RENAME TO "PengajuanMagang";
CREATE UNIQUE INDEX "PengajuanMagang_id_key" ON "PengajuanMagang"("id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
