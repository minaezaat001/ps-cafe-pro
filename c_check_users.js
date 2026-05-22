const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      password: true
    }
  });
  console.log('Current Users in DB:', JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

checkUsers();
