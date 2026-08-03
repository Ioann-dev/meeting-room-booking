import { IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @MinLength(1, { message: 'Verification token is required' })
  token!: string;
}
