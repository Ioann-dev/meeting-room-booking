#!/usr/bin/env node
// Runs a command with DATABASE_URL overridden to TEST_DATABASE_URL, so
// Prisma/Jest operate against the isolated test database instead of the
// dev one. A plain shell env override (`DATABASE_URL=$TEST_DATABASE_URL cmd`)
// can't see .env at all, and Prisma's own dotenv loading happens inside its
// own process, too late to override the parent shell's substitution -- this
// script loads .env itself first, then spawns the real command with the
// override already in place.
import 'dotenv/config';
import { spawnSync } from 'node:child_process';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  console.error('TEST_DATABASE_URL is not set (copy apps/api/.env.example to apps/api/.env).');
  process.exit(1);
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: node scripts/with-test-db.mjs <command> [...args]');
  process.exit(1);
}

const result = spawnSync(command, args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    DATABASE_URL: testDatabaseUrl,
    // Prisma's client runtime uses a dynamic import() internally; Jest's
    // default VM context rejects that without this flag. Harmless for the
    // non-Jest commands (e.g. `prisma migrate deploy`) this script also runs.
    NODE_OPTIONS: [process.env.NODE_OPTIONS, '--experimental-vm-modules'].filter(Boolean).join(' '),
  },
});

process.exit(result.status ?? 1);
