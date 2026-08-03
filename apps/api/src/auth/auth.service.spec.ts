import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as passwordUtil from './password.util';

jest.mock('./password.util');

describe('AuthService.login', () => {
  const mockedVerifyPassword = jest.mocked(passwordUtil.verifyPassword);
  const mockedGetDummyPasswordHash = jest.mocked(passwordUtil.getDummyPasswordHash);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetDummyPasswordHash.mockResolvedValue('dummy-hash-value');
  });

  function buildService(findUniqueResult: unknown) {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(findUniqueResult) },
    } as unknown as PrismaService;
    const config = { get: jest.fn() } as unknown as ConfigService;
    return new AuthService(prisma, config);
  }

  // Regression test for a real timing side-channel: verifyPassword used to
  // be skipped entirely when no user matched the email (short-circuited by
  // `!user ||`), making that response return in ~4ms versus ~38ms for a
  // wrong-password attempt against a real account -- an attacker could use
  // that timing gap alone to enumerate registered emails even though the
  // error message is identical either way.
  it('runs a real password verification against a dummy hash when no user matches', async () => {
    mockedVerifyPassword.mockResolvedValue(false);
    const service = buildService(null);

    await expect(
      service.login({ email: 'nobody@example.com', password: 'whatever-they-typed' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockedGetDummyPasswordHash).toHaveBeenCalledTimes(1);
    expect(mockedVerifyPassword).toHaveBeenCalledTimes(1);
    expect(mockedVerifyPassword).toHaveBeenCalledWith('dummy-hash-value', 'whatever-they-typed');
  });

  it('verifies against the real password hash when a user matches', async () => {
    mockedVerifyPassword.mockResolvedValue(false);
    const service = buildService({
      id: 'user-1',
      name: 'Real User',
      email: 'real@example.com',
      emailVerifiedAt: null,
      passwordHash: 'real-hash-value',
    });

    await expect(
      service.login({ email: 'real@example.com', password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockedGetDummyPasswordHash).not.toHaveBeenCalled();
    expect(mockedVerifyPassword).toHaveBeenCalledWith('real-hash-value', 'wrong-password');
  });
});
