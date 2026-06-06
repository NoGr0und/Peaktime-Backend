import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const users = await prisma.user.findMany()
  console.log(users.map(u => ({ email: u.email, supabaseId: u.supabaseId })))
}
main().finally(() => prisma.$disconnect())
