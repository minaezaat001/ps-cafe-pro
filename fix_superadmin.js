const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Connecting to database...');
    
    const username = 'superadmin';
    const password = 'superpassword123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { username },
      update: {
        password: hashedPassword,
        role: 'SUPER_ADMIN'
      },
      create: {
        username,
        password: hashedPassword,
        role: 'SUPER_ADMIN'
      }
    });

    console.log('Super Admin user verified/created:', user.username);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
