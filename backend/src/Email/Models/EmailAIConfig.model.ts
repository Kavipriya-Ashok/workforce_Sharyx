import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { BaseModel } from "@Model/Base.model";

export class EmailAIConfigModel extends BaseModel {
  @ApiProperty({ example: "default" })
  @IsOptional()
  @IsString()
  tenant_id: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  auto_reply_enabled: boolean;

  @ApiProperty({ example: "You are an executive email assistant for Sharyx. Keep replies polished and helpful." })
  @IsOptional()
  @IsString()
  system_prompt?: string;

  @ApiProperty({ example: "professional", enum: ["professional", "friendly", "persuasive"] })
  @IsOptional()
  @IsString()
  tone: string;

  @ApiProperty({ example: "openai", default: "openai" })
  @IsOptional()
  @IsString()
  llm_provider?: string;

  @ApiProperty({ example: "gpt-4o-mini", default: "gpt-4o-mini" })
  @IsOptional()
  @IsString()
  llm_model?: string;
}

export class GenerateEmailAIDraftModel {
  @ApiProperty({ example: "client@example.com" })
  @IsOptional()
  @IsString()
  from_email?: string;

  @ApiProperty({ example: "Pricing inquiry for CRM module" })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ example: "Can you share the pricing plan for 50 users?" })
  @IsOptional()
  @IsString()
  incoming_body?: string;

  @IsOptional()
  @IsString()
  lead_name?: string;

  @IsOptional()
  conversation_history?: Array<{ direction: string; body: string }>;

  @IsOptional()
  @IsBoolean()
  has_phone?: boolean;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsString()
  company_name?: string;
}
