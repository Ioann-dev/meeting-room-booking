import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. DB tests must run through `npm run test:db`, which points it at TEST_DATABASE_URL.',
  );
}

export const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });
