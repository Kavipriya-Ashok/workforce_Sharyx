import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { INTEGRATION_TYPES } from '@Service/Integrations/IntegrationStatus';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimLower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

/** Allowed values for `:type` in /Integrations/:type/Test|Disconnect. */
export const INTEGRATION_TYPE_VALUES: readonly string[] = INTEGRATION_TYPES;

/**
 * Body of PUT /Profile. Every field is optional (send only what changes) but validated when present.
 * Empty string clears an optional field (website, logo_url, industry, company_size).
 */
export class UpdateProfileDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Company name must be at least 2 characters' })
  @MaxLength(255, { message: 'Company name must be at most 255 characters' })
  name?: string;

  @IsOptional()
  @Transform(trimLower)
  @IsEmail({}, { message: 'Please enter a valid business email' })
  @MaxLength(255, { message: 'Email must be at most 255 characters' })
  email?: string;

  @IsOptional()
  @Transform(trim)
  @ValidateIf((_, v) => v !== '')
  @IsString()
  @MaxLength(255, { message: 'Website must be at most 255 characters' })
  @Matches(/^(https?:\/\/)?([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(:\d{2,5})?(\/[^\s]*)?$/, { message: 'Please enter a valid website, e.g. https://example.com' })
  website?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Address must be at least 3 characters' })
  @MaxLength(500, { message: 'Address must be at most 500 characters' })
  address?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Postal code must be at least 3 characters' })
  @MaxLength(20, { message: 'Postal code must be at most 20 characters' })
  postal_code?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100, { message: 'Industry must be at most 100 characters' })
  industry?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50, { message: 'Company size must be at most 50 characters' })
  company_size?: string;

  /** https image URL (e.g. your hosted logo). Empty string removes the logo. */
  @IsOptional()
  @Transform(trim)
  @ValidateIf((_, v) => v !== '')
  @IsString()
  @MaxLength(500, { message: 'Logo URL must be at most 500 characters' })
  @Matches(/^https:\/\/[^\s"'<>]+$/i, { message: 'Logo must be an https:// image link' })
  logo_url?: string;
}

export { IsIn };
