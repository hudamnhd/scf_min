import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { pengajuanId, isiLaporan, fileLaporan } = req.body;

      const magang = await prisma.laporanMagang.create({
        data: {
          pengajuanId,
          isiLaporan,
          fileLaporan,
        },
      });


      res.status(200).json({ message: "Permintaan magang berhasil dikirim." });
    } catch (error) {
      console.error(
        "Terjadi kesalahan saat memproses permintaan magang:",
        error,
      );
      res.status(500).json({
        message: "Terjadi kesalahan saat memproses permintaan magang.",
      });
    }
  } else {
    res.status(405).json({ message: "Method tidak diizinkan." });
  }
}
