import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const productId = req.query.id;
  console.warn("DEBUGPRINT[3]: [id].tsx:6: productId=", productId)

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const { metadata } = req.body;

    try {
      const updatedProduct = await prisma.product.update({
        where: {
          id: productId,
        },
        data: {
          metadata,
        },
      });

      res.status(200).json(updatedProduct);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Gagal mengupdate data produk' });
    }
  } else {
    res.status(405).json({ error: 'Metode tidak diizinkan' });
  }
}

