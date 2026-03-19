#!/usr/bin/env node
/**
 * Fix displayName for all users: set to `firstName + ' ' + lastName` (trimmed)
 * Run from repo root: `node backend/scripts/fixDisplayName.js`
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing displayName for users...');
  const users = await prisma.user.findMany({ select: { id: true, email: true, firstName: true, lastName: true, displayName: true } });
  let updated = 0;
  for (const u of users) {
    const newDisplay = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    if (newDisplay && u.displayName !== newDisplay) {
      await prisma.user.update({ where: { id: u.id }, data: { displayName: newDisplay } });
      console.log(`Updated ${u.email} -> "${newDisplay}"`);
      updated++;
    }
  }
  console.log(`Done. ${updated} users updated.`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
