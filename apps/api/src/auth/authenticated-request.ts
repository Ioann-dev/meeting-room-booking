import type { Request } from 'express';
import type { AuthenticatedUser } from './auth.service';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  sessionId: string;
}
