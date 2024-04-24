import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { pengajuanId, tanggalSidang, nilai, catatan } = req.body;

      const magang = await prisma.sidangMagang.create({
        data: {
          pengajuanId,
          tanggalSidang,
          nilai,
          catatan,
        },
      });

      res.status(200).json({ message: "Proses sidang magang berhasil diperbarui." });
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
