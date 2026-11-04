import { IsEnum, IsNotEmpty, IsOptional, IsString, IsArray, IsNumber } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum OmnichannelChannelEnum {
  WHATSAPP = "whatsapp",
  EMAIL = "email",
  CALL = "call",
}

export enum OmnichannelStatusEnum {
  NEW = "new",
  OPEN = "open",
  PENDING = "pending",
  RESOLVED = "resolved",
}

export class ConversationQueryDto {
  @ApiPropertyOptional({ enum: ["all", "whatsapp", "email", "call"], default: "all" })
  @IsOptional()
  channel?: "all" | "whatsapp" | "email" | "call";

  @ApiPropertyOptional({ enum: ["all", "new", "open", "pending", "resolved"], default: "all" })
  @IsOptional()
  status?: "all" | "new" | "open" | "pending" | "resolved";

  @ApiPropertyOptional({ description: "Search by customer name, phone, email, or summary keywords" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigned_to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  date_from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  date_to?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  limit?: number;
}

export class LeadQueryDto {
  @ApiPropertyOptional({ description: "Search by name, phone, or email" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ["all", "whatsapp", "email", "call"], default: "all" })
  @IsOptional()
  channel?: "all" | "whatsapp" | "email" | "call";

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  limit?: number;
}

export class LeadTimelineQueryDto {
  @ApiPropertyOptional({ enum: ["all", "whatsapp", "email", "call"], default: "all" })
  @IsOptional()
  channel?: "all" | "whatsapp" | "email" | "call";
}

export class SendLeadReplyDto {
  @ApiProperty({ enum: ["whatsapp", "email", "call"], default: "whatsapp" })
  @IsNotEmpty()
  channel: "whatsapp" | "email" | "call";

  @ApiProperty({ description: "Message body or call notes" })
  @IsNotEmpty()
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: "Email subject line (required for email)" })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: "Array of attachments" })
  @IsOptional()
  @IsArray()
  attachments?: Array<{ name: string; url: string; mimeType?: string; size?: number }>;
}

export class SendReplyDto {
  @ApiProperty({ description: "Message body to send" })
  @IsNotEmpty()
  @IsString()
  body: string;

  @ApiPropertyOptional({ enum: ["whatsapp", "email", "call"], description: "Target reply channel override" })
  @IsOptional()
  @IsString()
  channel?: "whatsapp" | "email" | "call";

  @ApiPropertyOptional({ description: "Email subject line (required for email, optional for others)" })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: "Array of attachments" })
  @IsOptional()
  @IsArray()
  attachments?: Array<{ name: string; url: string; mimeType?: string; size?: number }>;
}

export class UpdateConversationDto {
  @ApiPropertyOptional({ enum: OmnichannelStatusEnum })
  @IsOptional()
  @IsEnum(OmnichannelStatusEnum)
  status?: OmnichannelStatusEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigned_to?: string;
}

export class WhatsAppIncomingWebhookDto {
  @ApiPropertyOptional()
  @IsOptional()
  provider_message_id?: string;

  @ApiProperty({ description: "Customer Phone number (e.g. +919876543210)" })
  @IsNotEmpty()
  @IsString()
  from_phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customer_name?: string;

  @ApiProperty({ description: "WhatsApp message text" })
  @IsNotEmpty()
  @IsString()
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  attachments?: Array<{ name: string; url: string; mimeType?: string; size?: number }>;

  @ApiPropertyOptional()
  @IsOptional()
  timestamp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class EmailIncomingWebhookDto {
  @ApiPropertyOptional()
  @IsOptional()
  provider_message_id?: string;

  @ApiProperty({ description: "Customer sender email address" })
  @IsNotEmpty()
  @IsString()
  from_email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customer_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to_email?: string;

  @ApiProperty({ description: "Email subject line" })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({ description: "Email body text" })
  @IsNotEmpty()
  @IsString()
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  attachments?: Array<{ name: string; url: string; mimeType?: string; size?: number }>;

  @ApiPropertyOptional()
  @IsOptional()
  thread_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  timestamp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CallIncomingWebhookDto {
  @ApiPropertyOptional()
  @IsOptional()
  provider_call_id?: string;

  @ApiProperty({ description: "Customer phone number" })
  @IsNotEmpty()
  @IsString()
  phone_number: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customer_name?: string;

  @ApiPropertyOptional({ enum: ["inbound", "outbound"], default: "inbound" })
  @IsOptional()
  direction?: "inbound" | "outbound";

  @ApiPropertyOptional({ description: "Duration in seconds", default: 0 })
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recording_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transcript?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ai_summary?: string;

  @ApiPropertyOptional({ default: "completed" })
  @IsOptional()
  @IsString()
  outcome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  started_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  ended_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  telephony_provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

