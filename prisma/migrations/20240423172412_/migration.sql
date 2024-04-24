/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PengajuanMagang" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "nama" TEXT,
    "jabatan" TEXT,
    "perusahaan" TEXT,
    "kontak" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "jabatan", "kontak", "nama", "name", "password", "perusahaan", "role", "updatedAt") SELECT "createdAt", "email", "id", "jabatan", "kontak", "nama", "name", "password", "perusahaan", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
