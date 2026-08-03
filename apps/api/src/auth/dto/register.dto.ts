import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';
import { NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from 'shared';
import { trimStringValue } from '../trim.transform';

export class RegisterDto {
  @Transform(trimStringValue)
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(NAME_MAX_LENGTH, { message: `Name must be at most ${NAME_MAX_LENGTH} characters` })
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
