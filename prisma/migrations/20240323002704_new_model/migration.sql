-- AlterTable
ALTER TABLE "User" ADD COLUMN "jabatan" TEXT;
ALTER TABLE "User" ADD COLUMN "kontak" TEXT;
ALTER TABLE "User" ADD COLUMN "nama" TEXT;
ALTER TABLE "User" ADD COLUMN "perusahaan" TEXT;

-- CreateTable
CREATE TABLE "PengajuanMagang" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mahasiswaId" INTEGER NOT NULL,
    "jenisMagang" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "konsultasiPA" DATETIME NOT NULL,
    "rancangKRS" BOOLEAN NOT NULL,
    "learningAgreement" BOOLEAN NOT NULL,
    "validasiKaprodi" BOOLEAN NOT NULL,
    "validasiDekan" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PengajuanMagang_mahasiswaId_fkey" FOREIGN KEY ("mahasiswaId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LaporanMagang" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pengajuanId" INTEGER NOT NULL,
    "isiLaporan" TEXT NOT NULL,
    "fileLaporan" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LaporanMagang_pengajuanId_fkey" FOREIGN KEY ("pengajuanId") REFERENCES "PengajuanMagang" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SidangMagang" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pengajuanId" INTEGER NOT NULL,
    "tanggalSidang" DATETIME NOT NULL,
    "nilai" REAL NOT NULL,
    "catatan" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SidangMagang_pengajuanId_fkey" FOREIGN KEY ("pengajuanId") REFERENCES "PengajuanMagang" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
