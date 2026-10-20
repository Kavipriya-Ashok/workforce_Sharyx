import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { BaseModel } from "@Model/Base.model";

export class EmailAccountConfigModel extends BaseModel {
  @ApiProperty({ example: "default" })
  @IsOptional()
  @IsString()
  tenant_id: string;

  @ApiProperty({ example: "smtp", default: "smtp" })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ example: "Support Team", required: false })
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiProperty({ example: "support@sharyx.com" })
  @IsNotEmpty({ message: "Email address is required" })
  @IsEmail({}, { message: "Invalid email format" })
  email_address: string;

  @ApiProperty({ example: "your-client-id.apps.googleusercontent.com", required: false })
  @IsOptional()
  @IsString()
  client_id?: string;

  @ApiProperty({ example: "GOCSPX-...", required: false })
  @IsOptional()
  @IsString()
  client_secret?: string;

  @ApiProperty({ example: "smtp.gmail.com", required: false })
  @IsOptional()
  @IsString()
  smtp_host?: string;

  @ApiProperty({ example: 587, default: 587, required: false })
  @IsOptional()
  @IsNumber()
  smtp_port?: number;

  @ApiProperty({ example: "support@sharyx.com", required: false })
  @IsOptional()
  @IsString()
  smtp_user?: string;

  @ApiProperty({ example: "app_password_here", required: false })
  @IsOptional()
  @IsString()
  smtp_password?: string;

  @ApiProperty({ example: "imap.gmail.com", required: false })
  @IsOptional()
  @IsString()
  imap_host?: string;

  @ApiProperty({ example: 993, default: 993 })
  @IsOptional()
  @IsNumber()
  imap_port?: number;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  use_ssl?: boolean;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
