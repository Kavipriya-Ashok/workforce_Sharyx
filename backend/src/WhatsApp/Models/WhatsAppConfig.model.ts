import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, IsBoolean } from "class-validator";
import { BaseModel } from "@Model/Base.model";

export class WhatsAppConfigModel extends BaseModel {
  @ApiProperty({ example: "default" })
  @IsOptional()
  @IsString()
  tenant_id: string;

  @ApiProperty({ example: "+15551234567" })
  @IsNotEmpty({ message: "Phone number is required" })
  @IsString()
  phone_number: string;

  @ApiProperty({ example: "100234567890123" })
  @IsNotEmpty({ message: "Phone Number ID is required" })
  @IsString()
  phone_number_id: string;

  @ApiProperty({ example: "987654321012345", required: false })
  @IsOptional()
  @IsString()
  waba_id?: string;

  @ApiProperty({ example: "EAAG..." })
  @IsNotEmpty({ message: "Meta Access Token is required" })
  @IsString()
  access_token: string;

  @ApiProperty({ example: "sharyx_verify_token_secure" })
  @IsOptional()
  @IsString()
  verify_token?: string;

  @ApiProperty({ example: "meta_cloud", enum: ["meta_cloud", "qr_gateway", "custom_gateway", "twilio"], required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ example: "https://api.custom-wa-gateway.com/v1", required: false })
  @IsOptional()
  @IsString()
  api_url?: string;

  @ApiProperty({ example: "custom_api_key_secret", required: false })
  @IsOptional()
  @IsString()
  api_key?: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  is_connected?: boolean;
}
