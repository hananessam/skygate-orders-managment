import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../../src/generated/prisma/client';

const BCRYPT_ROUNDS = 12;
const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_ADMIN_NAME = 'Admin';
const DEFAULT_ADMIN_PASSWORD = 'Admin12345!';

export async function seedUsers(prisma: PrismaClient): Promise<void> {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
  const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

  await prisma.user.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: {
      name: DEFAULT_ADMIN_NAME,
      password: passwordHash,
    },
    create: {
      email: DEFAULT_ADMIN_EMAIL,
      name: DEFAULT_ADMIN_NAME,
      password: passwordHash,
    },
  });
}
