import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, IsBoolean, IsIn, Matches, MaxLength } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
import { BaseModel } from "@Model/Base.model";

export class WhatsAppConfigModel extends BaseModel {
  // Ignored by the server: the tenant always comes from the authenticated JWT.
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tenant_id?: string;

  @ApiProperty({ example: "+15551234567" })
  @Transform(trim)
  @IsNotEmpty({ message: "Phone number is required" })
  @IsString()
  @Matches(/^\+?[0-9 ()-]{5,30}$/, { message: "Phone number may contain only digits, spaces, + ( ) -" })
  phone_number: string;

  @ApiProperty({ example: "100234567890123" })
  @Transform(trim)
  @IsNotEmpty({ message: "Phone Number ID is required" })
  @IsString()
  @MaxLength(100, { message: "Phone Number ID must be at most 100 characters" })
  phone_number_id: string;

  @ApiProperty({ example: "987654321012345", required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100, { message: "WABA ID must be at most 100 characters" })
  waba_id?: string;

  // Optional on update (blank keeps the stored token). Required on first save - enforced in the service.
  @ApiProperty({ example: "EAAG...", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1024, { message: "Access token is too long" })
  access_token?: string;

  @ApiProperty({ required: false, description: "Meta App Secret (webhook signature verification). Write-only." })
  @IsOptional()
  @IsString()
  @MaxLength(256, { message: "App secret is too long" })
  app_secret?: string;

  @ApiProperty({ example: "sharyx_verify_token_secure" })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: "Verify token must be at most 100 characters" })
  verify_token?: string;

  @ApiProperty({ example: "meta_cloud", enum: ["meta_cloud", "qr_gateway", "custom_gateway", "twilio"], required: false })
  @IsOptional()
  @IsIn(["meta_cloud", "qr_gateway", "custom_gateway", "twilio"], { message: "Unknown WhatsApp provider" })
  provider?: string;

  @ApiProperty({ example: "https://api.custom-wa-gateway.com/v1", required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500, { message: "API URL is too long" })
  api_url?: string;

  @ApiProperty({ example: "custom_api_key_secret", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512, { message: "API key is too long" })
  api_key?: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  is_connected?: boolean;
}
