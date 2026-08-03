import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { canonicalizeEmail, type CurrentUser } from 'shared';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { hashPassword, verifyPassword } from './password.util';
import { generateOpaqueToken, hashToken } from './token.util';
import { EMAIL_VERIFICATION_TTL_MS, SESSION_TTL_MS } from './auth.constants';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: Date | null;
}

export interface AuthResult {
  user: AuthenticatedUser;
  sessionToken: string;
}

function toCurrentUser(user: AuthenticatedUser): CurrentUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = canonicalizeEmail(dto.email);
    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.user
      .create({
        data: { name: dto.name, email, passwordHash },
        select: { id: true, name: true, email: true, emailVerifiedAt: true },
      })
      .catch((error: unknown) => {
        if (isUniqueConstraintViolation(error)) {
          throw new ConflictException('An account with this email already exists');
        }
        throw error;
      });

    await this.issueEmailVerificationToken(user.id, user.email);
    const sessionToken = await this.createSession(user.id);

    return { user, sessionToken };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const email = canonicalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, emailVerifiedAt: true, passwordHash: true },
    });

    // Same generic message whether the email doesn't exist or the password
    // is wrong, so a failed attempt can't be used to enumerate accounts.
    if (!user || !(await verifyPassword(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const sessionToken = await this.createSession(user.id);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt,
      },
      sessionToken,
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }

  async validateSessionToken(
    rawToken: string,
  ): Promise<{ sessionId: string; user: AuthenticatedUser } | null> {
    const tokenHash = hashToken(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: { select: { id: true, name: true, email: true, emailVerifiedAt: true } },
      },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt.getTime() < Date.now()) {
      // Opportunistic cleanup: an expired session is never valid again, so
      // there is no reason to keep it around once we happen to see it.
      await this.prisma.session.deleteMany({ where: { id: session.id } });
      return null;
    }

    return { sessionId: session.id, user: session.user };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const tokenHash = hashToken(dto.token);
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

    const invalid =
      !record || record.consumedAt !== null || record.expiresAt.getTime() < Date.now();
    if (invalid) {
      throw new UnauthorizedException('This verification link is invalid or has expired.');
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);
  }

  toCurrentUser(user: AuthenticatedUser): CurrentUser {
    return toCurrentUser(user);
  }

  private async createSession(userId: string): Promise<string> {
    const rawToken = generateOpaqueToken();
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });
    return rawToken;
  }

  private async issueEmailVerificationToken(userId: string, email: string): Promise<void> {
    const rawToken = generateOpaqueToken();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    });

    const webOrigin = this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000';
    const verificationUrl = `${webOrigin}/verify-email?token=${rawToken}`;
    // Development stand-in for sending a real email; never log the raw
    // token under any other label; this line exists specifically so a
    // developer/evaluator can complete the flow without SMTP.
    this.logger.log(`Verification link for ${email}: ${verificationUrl}`);
  }
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
