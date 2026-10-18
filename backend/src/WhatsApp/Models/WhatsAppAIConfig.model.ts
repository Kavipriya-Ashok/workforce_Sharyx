import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";
import { BaseModel } from "@Model/Base.model";

export class WhatsAppAIConfigModel extends BaseModel {
  @ApiProperty({ example: "default" })
  @IsOptional()
  @IsString()
  tenant_id: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  is_ai_enabled: boolean;

  @ApiProperty({ example: "hybrid", enum: ["fully_automated", "hybrid", "manual"] })
  @IsOptional()
  @IsString()
  ai_mode: string;

  @ApiProperty({ example: "You are a professional customer support assistant for Sharyx." })
  @IsOptional()
  @IsString()
  system_prompt?: string;

  @ApiProperty({ example: "Hello! Thank you for reaching out to us. How can we help you?" })
  @IsOptional()
  @IsString()
  welcome_message?: string;

  @ApiProperty({ example: "One of our team members will connect with you shortly." })
  @IsOptional()
  @IsString()
  fallback_message?: string;

  @ApiProperty({ example: "openai", default: "openai" })
  @IsOptional()
  @IsString()
  llm_provider?: string;

  @ApiProperty({ example: "gpt-4o-mini", default: "gpt-4o-mini" })
  @IsOptional()
  @IsString()
  llm_model?: string;

  @ApiProperty({ example: "sk-... or AIzaSy...", required: false })
  @IsOptional()
  @IsString()
  api_key?: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  auto_followup_enabled?: boolean;

  @ApiProperty({ example: 60 })
  @IsOptional()
  @IsNumber()
  followup_delay_minutes?: number;

  @ApiProperty({ example: "Hi! Just checking if you received our response and need further assistance." })
  @IsOptional()
  @IsString()
  followup_message?: string;

  @ApiProperty({ example: ["STOP", "UNSUBSCRIBE"], type: [String], required: false })
  @IsOptional()
  stop_words?: string[];
}
