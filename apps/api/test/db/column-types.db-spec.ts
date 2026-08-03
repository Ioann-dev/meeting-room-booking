import { prisma } from './prisma-test-client';

interface ColumnTypeRow {
  table_name: string;
  column_name: string;
  data_type: string;
}

describe('Temporal column types (database-level)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('stores every DateTime column as timestamptz, never a timezone-naive timestamp', async () => {
    const rows = await prisma.$queryRaw<ColumnTypeRow[]>`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('User', 'Session', 'EmailVerificationToken', 'Room', 'Booking', 'BookingSeries', 'Notification')
        AND data_type LIKE 'timestamp%'
    `;

    expect(rows.length).toBeGreaterThan(0);

    const naive = rows.filter((row) => row.data_type !== 'timestamp with time zone');
    expect(naive).toEqual([]);
  });
});
