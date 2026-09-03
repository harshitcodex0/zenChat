import { prisma } from './lib/db.js'; async function main() { const chat = await prisma.chat.findFirst(); console.log(chat.id, chat.userId); } main().catch(console.error);
