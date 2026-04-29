import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('superadmin123', 10);
  
  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {
      password: hashedPassword,
      role: 'SUPER_ADMIN'
    },
    create: {
      username: 'superadmin',
      password: hashedPassword,
      role: 'SUPER_ADMIN'
    }
  });

  console.log('Super Admin password set to: superadmin123');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
