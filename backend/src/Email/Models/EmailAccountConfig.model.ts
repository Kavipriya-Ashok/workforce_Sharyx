import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";
import { BaseModel } from "@Model/Base.model";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const HOST_RE = /^[A-Za-z0-9]([A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/;

/**
 * Body of POST /Email/Config and POST /Email/Test-Connection. Every property is validated; OAuth secrets
 * (client_secret / access_token / refresh_token) are deliberately NOT accepted from a browser at all - they only
 * ever come from the server-side Google OAuth flow.
 */
export class EmailAccountConfigModel extends BaseModel {
  /** Ignored: the tenant always comes from the verified JWT. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenant_id: string;

  @ApiProperty({ example: "smtp", enum: ["smtp", "google-email"], required: false })
  @IsOptional()
  @IsIn(["smtp", "google-email"], { message: "provider must be smtp or google-email" })
  provider?: string;

  @ApiProperty({ example: "Support Team", required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150, { message: "Display name must be at most 150 characters" })
  display_name?: string;

  @ApiProperty({ example: "support@sharyx.com" })
  @Transform(trim)
  @IsNotEmpty({ message: "Email address is required" })
  @IsEmail({}, { message: "Invalid email format" })
  @MaxLength(150, { message: "Email must be at most 150 characters" })
  email_address: string;

  @ApiProperty({ example: "smtp.gmail.com", required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(HOST_RE, { message: "SMTP host is not a valid host name" })
  smtp_host?: string;

  @ApiProperty({ example: 587, required: false })
  @IsOptional()
  @IsInt({ message: "SMTP port must be a whole number" })
  @Min(1)
  @Max(65535)
  smtp_port?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150, { message: "SMTP user must be at most 150 characters" })
  smtp_user?: string;

  /** Write-only. Blank keeps the stored password. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(256, { message: "Password must be at most 256 characters" })
  smtp_password?: string;

  @ApiProperty({ example: "imap.gmail.com", required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Matches(HOST_RE, { message: "IMAP host is not a valid host name" })
  imap_host?: string;

  @ApiProperty({ example: 993, required: false })
  @IsOptional()
  @IsInt({ message: "IMAP port must be a whole number" })
  @Min(1)
  @Max(65535)
  imap_port?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  use_ssl?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
