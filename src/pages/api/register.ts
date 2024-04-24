// pages/api/register.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ error: "Metode yang diperbolehkan hanya POST" });
  }

  try {
    const { id, name, email, password, role } = req.body;

    // Menyimpan data ke basis data menggunakan Prisma
    const newUser = await prisma.user.create({
      data: {
        id,
        name,
        email,
        password,
        role,
      },
    });

    // res.status(201).json(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    console.error("Kesalahan:", error);
    res.status(500).json({ error: "Terjadi kesalahan saat menyimpan data." });
  }
}
