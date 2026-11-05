import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Request DTOs for every /Auth/* endpoint. The Auth controller runs them through a strict
 * ValidationPipe (whitelist + transform), so a field without a decorator here is dropped and a
 * malformed value is a 400 — never a 500 from the database.
 */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const PASSWORD_RULE_MESSAGE =
  'Password must be 8-128 characters and include an uppercase letter, a lowercase letter, a number and a symbol';

const trimLower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** min 8, max 128, at least one upper, lower, digit and symbol. Same rule is mirrored in the frontend. */
export function IsStrongPassword(options?: ValidationOptions): PropertyDecorator {
  return (target, key) => {
    registerDecorator({
      name: 'isStrongPassword',
      target: target.constructor,
      propertyName: key as string,
      options: { message: PASSWORD_RULE_MESSAGE, ...options },
      validator: {
        validate(v: unknown) {
          return (
            typeof v === 'string' &&
            v.length >= PASSWORD_MIN &&
            v.length <= PASSWORD_MAX &&
            /[a-z]/.test(v) &&
            /[A-Z]/.test(v) &&
            /\d/.test(v) &&
            /[^A-Za-z0-9\s]/.test(v)
          );
        },
      },
    });
  };
}

/** Field must equal another field of the same object (e.g. confirm_password === password). */
export function MatchesField(other: string, options?: ValidationOptions): PropertyDecorator {
  return (target, key) => {
    registerDecorator({
      name: 'matchesField',
      target: target.constructor,
      propertyName: key as string,
      constraints: [other],
      options: { message: 'Confirm password does not match password', ...options },
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          return typeof value === 'string' && value === (args.object as any)[args.constraints[0]];
        },
      },
    });
  };
}

const EMAIL_OPTS = { allow_utf8_local_part: false } as const;

export class LoginDto {
  @Transform(trimLower)
  @IsEmail(EMAIL_OPTS, { message: 'Please enter a valid email address' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  @ApiProperty({ required: true })
  email: string;

  @IsString({ message: 'Password required' })
  @IsNotEmpty({ message: 'Password required' })
  @MaxLength(PASSWORD_MAX, { message: `Password must be at most ${PASSWORD_MAX} characters` })
  @ApiProperty({ required: true })
  password: string;
}

export class SendSignupOtpDto {
  @Transform(trimLower)
  @IsEmail(EMAIL_OPTS, { message: 'Please enter a valid email address' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  @ApiProperty({ required: true })
  email: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255, { message: 'Name must be at most 255 characters' })
  @ApiProperty({ required: false })
  name?: string;
}

export class ResendSignupOtpDto {
  @Transform(trimLower)
  @IsEmail(EMAIL_OPTS, { message: 'Please enter a valid email address' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  @ApiProperty({ required: true })
  email: string;
}

export class VerifySignupOtpDto {
  @Transform(trimLower)
  @IsEmail(EMAIL_OPTS, { message: 'Please enter a valid email address' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  @ApiProperty({ required: true })
  email: string;

  @Transform(trim)
  @Matches(/^\d{6}$/, { message: 'Verification code must be exactly 6 digits' })
  @ApiProperty({ required: true })
  otp: string;

  @IsStrongPassword()
  @ApiProperty({ required: true })
  password: string;

  @MatchesField('password')
  @ApiProperty({ required: true })
  confirm_password: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255, { message: 'Company name must be at most 255 characters' })
  @ApiProperty({ required: false })
  company_name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100, { message: 'First name must be at most 100 characters' })
  first_name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100, { message: 'Last name must be at most 100 characters' })
  last_name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100, { message: 'Username must be at most 100 characters' })
  username?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(32, { message: 'Mobile must be at most 32 characters' })
  mobile?: string;
}

export class GoogleAuthDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  redirect_uri?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8192)
  credential?: string;
}

export class ForgotPasswordDto {
  @Transform(trimLower)
  @IsEmail(EMAIL_OPTS, { message: 'Please enter a valid email address' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  @ApiProperty({ required: true })
  email: string;
}

export class ResetPasswordDto {
  /** Encrypted user id carried by the reset e-mail link. Optional: the UI uses `email` + code instead. */
  @IsOptional()
  @IsString({ message: 'Invalid or expired reset link' })
  @MaxLength(512, { message: 'Invalid or expired reset link' })
  @Matches(/^[0-9a-fA-F]+$/, { message: 'Invalid or expired reset link' })
  @ApiProperty({ required: false })
  user_id?: string;

  @IsOptional()
  @Transform(trimLower)
  @IsEmail(EMAIL_OPTS, { message: 'Please enter a valid email address' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  @ApiProperty({ required: false })
  email?: string;

  @Transform(({ value }) => (typeof value === 'string' && /^\s*\d{6}\s*$/.test(value) ? Number(value.trim()) : value))
  @IsInt({ message: 'Reset code must be exactly 6 digits' })
  @Min(100000, { message: 'Reset code must be exactly 6 digits' })
  @Max(999999, { message: 'Reset code must be exactly 6 digits' })
  @ApiProperty({ required: true })
  reset_otp: number;

  @IsStrongPassword()
  @ApiProperty({ required: true })
  password: string;

  @MatchesField('password')
  @ApiProperty({ required: true })
  confirm_password: string;
}
