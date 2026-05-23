import { PrismaClient } from '../../src/generated/prisma/client';
import { seedUsers } from './user.seeder';

type Seeder = (prisma: PrismaClient) => Promise<void>;

const seeders: Seeder[] = [seedUsers];

export async function runSeeders(prisma: PrismaClient): Promise<void> {
  for (const seed of seeders) {
    await seed(prisma);
  }
}
