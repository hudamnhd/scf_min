import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { id, metadata } = req.body;

    try {
      const newProduct = await prisma.product.create({
        data: {
          id,
          metadata,
        },
      });
      res.status(201).json(newProduct);
    } catch (error) {
      console.warn("DEBUGPRINT[3]: post.tsx:17: error=", error);
      res.status(500).json({ error: "Gagal membuat produk baru" });
    }
  } else {
    res.status(405).json({ error: "Metode tidak diizinkan" });
  }
}
