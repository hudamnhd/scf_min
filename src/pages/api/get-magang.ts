import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      // Ambil data PengajuanMagang dari database
      const pengajuanMagang = await prisma.pengajuanMagang.findMany({
        include: { mahasiswa: true, laporanMagang: true, sidangMagang: true },
      });

      // Kirim data sebagai respons
      res.status(200).json(pengajuanMagang);
    } catch (error) {
      console.error("Gagal mengambil data PengajuanMagang:", error);
      res
        .status(500)
        .json({
          message: "Terjadi kesalahan saat mengambil data PengajuanMagang.",
        });
    }
  } else {
    res.status(405).json({ message: "Method tidak diizinkan." });
  }
}
