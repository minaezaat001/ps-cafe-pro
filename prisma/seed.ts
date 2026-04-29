import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Clear existing in order of relations
  await prisma.sessionSegment.deleteMany()
  await prisma.order.deleteMany()
  await prisma.saleItem.deleteMany()
  await prisma.sale.deleteMany()
  await prisma.session.deleteMany()
  await prisma.financialTransaction.deleteMany()
  await prisma.shift.deleteMany()
  await prisma.device.deleteMany()
  await prisma.deviceType.deleteMany()
  await prisma.inventoryItem.deleteMany()
  await prisma.appSetting.deleteMany()
  await prisma.user.deleteMany()

  // Create Super Admin (Platform Owner)
  await prisma.user.create({
    data: {
      username: 'superadmin',
      password: 'superpassword123', // In real app, hash this
      role: 'SUPER_ADMIN',
    }
  })

  // Create Admin
  await prisma.user.create({
    data: {
      username: 'admin',
      password: 'admin123', // In real app, hash this
      role: 'ADMIN',
    }
  })

  console.log('Seed completed successfully - Ready for Setup Wizard')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
