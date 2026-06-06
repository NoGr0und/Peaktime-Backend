import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const users = await prisma.user.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 5
  })
  console.log(users.map(u => ({ email: u.email, role: u.role, updatedAt: u.updatedAt })))
}
main().finally(() => prisma.$disconnect())
