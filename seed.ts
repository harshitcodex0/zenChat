require('dotenv').config(); import { prisma } from './lib/db'; async function run() { const chars = await prisma.character.findMany(); console.log(chars); } run();
