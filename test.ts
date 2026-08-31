import 'dotenv/config';
import { prisma } from './lib/db';
prisma.character.findMany().then(c => { console.log('Found characters:', c.length); process.exit(0); });
