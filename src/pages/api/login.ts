
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email, password } = req.body;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode yang diperbolehkan hanya POST' });
  }

  // Cari pengguna berdasarkan email
  const user = await prisma.user.findUnique({ where: { email: email } });

  if (!user) {
    return res.status(401).json({ error: 'Email atau kata sandi salah' });
  }

  // Langsung membandingkan kata sandi tanpa hashing
  if (user.password !== password) {
    return res.status(401).json({ error: 'Email atau kata sandi salah' });
  }

  // Kirim tanggapan sukses jika autentikasi berhasil
  res.status(200).json({ message: 'Login berhasil', user });
}
