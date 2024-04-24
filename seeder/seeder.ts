import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    try {
        // Hash kata sandi
        const hashedPassword = await bcrypt.hashSync('password', 10); // Pastikan menggunakan await di sini

        // Menambahkan pengguna (user) ke dalam basis data
        await prisma.user.create({
            data: {
                email: 'mahasiswa@example.com',
                password: hashedPassword,
                role: 'mahasiswa'
            }
        });

        // Menampilkan pesan selesai
        console.log('Seeder selesai!');
    } catch (error) {
        // Menangani kesalahan
        console.error('Kesalahan:', error);
    } finally {
        // Menutup koneksi Prisma
        await prisma.$disconnect();
    }
}

main();
