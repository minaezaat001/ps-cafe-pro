import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany()
  console.log('Users in DB:', users.map(u => ({ username: u.username, role: u.role })))
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
