import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { jenisMagang, status, mataKuliah, codeKuliah, userId, id } =
      req.body;
    try {
      const magang = await prisma.pengajuanMagang.create({
        data: {
          jenisMagang,
          status,
          id,
          mataKuliah,
          codeKuliah,
          mahasiswaId: userId,
        },
      });

      res.status(200).json({ message: "Permintaan magang berhasil dikirim." });
    } catch (error) {
      console.error(
        "Terjadi kesalahan saat memproses permintaan magang:",
        error,
      );
      res
        .status(500)
        .json({
          message: "Terjadi kesalahan saat memproses permintaan magang.",
        });
    }
  } else if (req.method === "PUT") {
    // Menggunakan method PUT untuk update data
    try {
      const {
        id,
        status,
        konsultasiPA,
        rancangKRS,
        learningAgreement,
        validasiDekan,
        validasiKaprodi,
      } = req.body; // Dapatkan data yang dikirim dalam body permintaan

      // Lakukan pembaruan data PengajuanMagang berdasarkan id
      const updatedPengajuanMagang = await prisma.pengajuanMagang.update({
        where: { id }, // Tentukan entri yang akan diperbarui berdasarkan id
        data: {
          status,
          konsultasiPA,
          rancangKRS,
          learningAgreement,
          validasiDekan,
          validasiKaprodi,
        }, // Tentukan data yang akan diperbarui
      });

console.log('updatedPengajuanMagang:',  updatedPengajuanMagang);
      // Kirim data yang telah diperbarui sebagai respons
      res.status(200).json(updatedPengajuanMagang);
    } catch (error) {
      console.error("Gagal melakukan pembaruan data PengajuanMagang:", error);
      res.status(500).json({
        message:
          "Terjadi kesalahan saat melakukan pembaruan data PengajuanMagang.",
      });
    }
  } else {
    res.status(405).json({ message: "Method tidak diizinkan." });
  }
}
