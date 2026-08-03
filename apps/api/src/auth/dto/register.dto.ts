import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from 'shared';
import { trimStringValue } from '../trim.transform';

export class RegisterDto {
  @Transform(trimStringValue)
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name!: string;

  @Transform(trimStringValue)
  @IsEmail({}, { message: 'A valid email address is required' })
  email!: string;

  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, {
    message: `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
  })
  password!: string;
}
