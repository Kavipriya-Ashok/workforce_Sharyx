import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { BaseModel } from "@Model/Base.model";

const trimStr = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

/** Body of POST /WhatsApp/AI/Config (strict pipe: unknown fields are dropped, bad values are a 400). */
export class WhatsAppAIConfigModel extends BaseModel {
  /** Ignored: the tenant always comes from the verified JWT. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenant_id: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  is_ai_enabled: boolean;

  @ApiProperty({ example: "hybrid", enum: ["fully_automated", "hybrid", "manual"] })
  @IsOptional()
  @IsIn(["fully_automated", "hybrid", "manual"], { message: "AI mode must be fully_automated, hybrid or manual" })
  ai_mode: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(8000, { message: "The AI instructions can be at most 8000 characters" })
  system_prompt?: string;

  /** First message: sent once, when a NEW customer writes to this number. Empty = nothing is sent. */
  @ApiProperty({ required: false, example: "Hi {name}, welcome to {company}! How can we help you today?" })
  @IsOptional()
  @Transform(trimStr)
  @IsString()
  @MaxLength(1000, { message: "The first message can be at most 1000 characters" })
  welcome_message?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(trimStr)
  @IsString()
  @MaxLength(1000, { message: "The fallback message can be at most 1000 characters" })
  fallback_message?: string;

  @ApiProperty({ example: "gemini", required: false })
  @IsOptional()
  @IsIn(["gemini", "openai"], { message: "AI provider must be gemini or openai" })
  llm_provider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  llm_model?: string;

  /** Write-only. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512, { message: "API key is too long" })
  api_key?: string;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  auto_followup_enabled?: boolean;

  /** Minutes of silence before the follow-up. Free-text WhatsApp messages only work inside 24 h, so < 24 h. */
  @ApiProperty({ example: 60 })
  @IsOptional()
  @IsInt({ message: "Follow-up delay must be a whole number of minutes" })
  @Min(1, { message: "Follow-up delay must be at least 1 minute" })
  @Max(1380, { message: "Follow-up delay must be under 23 hours (WhatsApp only allows free text inside 24 hours)" })
  followup_delay_minutes?: number;

  @ApiProperty({ required: false, example: "Hi {name}, just checking if you still need help." })
  @IsOptional()
  @Transform(trimStr)
  @IsString()
  @MaxLength(1000, { message: "The follow-up message can be at most 1000 characters" })
  followup_message?: string;

  @ApiProperty({ example: ["STOP", "UNSUBSCRIBE"], type: [String], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: "At most 10 opt-out words" })
  @IsString({ each: true })
  @MaxLength(30, { each: true, message: "An opt-out word can be at most 30 characters" })
  stop_words?: string[];
}
