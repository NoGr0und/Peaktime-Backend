import { prisma } from './lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'joaovinicius230305@gmail.com' },
  });
  console.log('USER_DETAILS:', JSON.stringify(user, null, 2));
}

main().catch(console.error);
