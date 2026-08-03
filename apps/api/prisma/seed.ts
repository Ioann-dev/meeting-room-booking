import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { hashPassword } from '../src/auth/password.util';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set (copy apps/api/.env.example to apps/api/.env)');
}

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

const ROOMS = [
  { name: 'Athens', floor: 1, capacity: 4 },
  { name: 'Berlin', floor: 1, capacity: 8 },
  { name: 'Copenhagen', floor: 2, capacity: 12 },
  { name: 'Dublin', floor: 2, capacity: 6 },
  { name: 'Edinburgh', floor: 3, capacity: 20 },
  { name: 'Florence', floor: 3, capacity: 2 },
] as const;

// Documented in README as the two test-user credentials. Passwords satisfy
// the 8-72 character rule; no composition rules are required.
const TEST_USERS = [
  { name: 'Alice Johnson', email: 'alice@example.com', password: 'AlicePassword123' },
  { name: 'Bob Smith', email: 'bob@example.com', password: 'BobPassword123' },
] as const;

// Fixed UTC instants, not a computed offset -- each comment states the
// Kyiv local time it represents (UTC+3 in August, EEST). Picking literal
// timestamps here avoids a hand-rolled offset conversion in seed code,
// which is exactly what "never hardcode UTC offsets" rules out; the real
// DST-safe office-time conversion utility is Phase 04's job.
const DEMO_BOOKINGS = [
  {
    room: 'Athens',
    user: 'alice@example.com',
    title: 'Sprint Planning',
    startAt: '2026-08-04T07:00:00.000Z', // 10:00 Kyiv
    endAt: '2026-08-04T08:00:00.000Z', // 11:00 Kyiv
  },
  {
    room: 'Berlin',
    user: 'bob@example.com',
    title: 'Client Demo',
    startAt: '2026-08-04T11:00:00.000Z', // 14:00 Kyiv
    endAt: '2026-08-04T12:30:00.000Z', // 15:30 Kyiv
  },
  {
    room: 'Copenhagen',
    user: 'alice@example.com',
    title: '1:1 Sync',
    startAt: '2026-08-05T06:30:00.000Z', // 09:30 Kyiv
    endAt: '2026-08-05T07:30:00.000Z', // 10:30 Kyiv
  },
  {
    room: 'Dublin',
    user: 'bob@example.com',
    title: 'Design Review',
    startAt: '2026-08-05T13:00:00.000Z', // 16:00 Kyiv
    endAt: '2026-08-05T14:00:00.000Z', // 17:00 Kyiv
  },
  {
    room: 'Athens',
    user: 'bob@example.com',
    title: 'Team Retro',
    startAt: '2026-08-06T09:00:00.000Z', // 12:00 Kyiv
    endAt: '2026-08-06T10:00:00.000Z', // 13:00 Kyiv
  },
  {
    room: 'Edinburgh',
    user: 'alice@example.com',
    title: 'All Hands',
    startAt: '2026-08-06T12:30:00.000Z', // 15:30 Kyiv
    endAt: '2026-08-06T14:30:00.000Z', // 17:30 Kyiv
  },
] as const;

async function main() {
  const rooms = await Promise.all(
    ROOMS.map((room) =>
      prisma.room.upsert({
        where: { name: room.name },
        update: { floor: room.floor, capacity: room.capacity },
        create: room,
      }),
    ),
  );
  const roomByName = new Map(rooms.map((room) => [room.name, room]));

  const users = await Promise.all(
    TEST_USERS.map(async (testUser) => {
      const passwordHash = await hashPassword(testUser.password);
      return prisma.user.upsert({
        where: { email: testUser.email },
        update: { emailVerifiedAt: new Date() },
        create: {
          name: testUser.name,
          email: testUser.email,
          passwordHash,
          emailVerifiedAt: new Date(),
        },
      });
    }),
  );
  const userByEmail = new Map(users.map((user) => [user.email, user]));

  // Demo bookings have no natural unique key of their own (a compound
  // unique on room+start would just duplicate what the overlap exclusion
  // constraint already guarantees), so re-running the seed clears the
  // previous demo bookings for our seed users first instead.
  await prisma.booking.deleteMany({ where: { userId: { in: users.map((user) => user.id) } } });

  for (const demo of DEMO_BOOKINGS) {
    const room = roomByName.get(demo.room);
    const user = userByEmail.get(demo.user);
    if (!room || !user) {
      throw new Error(`Seed data references unknown room/user: ${demo.room} / ${demo.user}`);
    }
    await prisma.booking.create({
      data: {
        title: demo.title,
        startAt: new Date(demo.startAt),
        endAt: new Date(demo.endAt),
        roomId: room.id,
        userId: user.id,
      },
    });
  }

  console.log(
    `Seeded ${rooms.length} rooms, ${users.length} users, ${DEMO_BOOKINGS.length} bookings.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
