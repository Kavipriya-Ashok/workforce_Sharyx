import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { BaseModel } from "@Model/Base.model";

export class WhatsAppCampaignModel extends BaseModel {
  @ApiProperty({ example: "Summer Promo 2026" })
  @IsNotEmpty({ message: "Campaign name is required" })
  @IsString()
  name: string;

  @ApiProperty({ example: "summer_offer_v1" })
  @IsNotEmpty({ message: "Template name is required" })
  @IsString()
  template_name: string;

  @ApiProperty({ example: "Triggered after call ends", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: "round_1_cleared", required: false })
  @IsOptional()
  @IsString()
  trigger_event?: string;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  delay_minutes?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ example: ["+919876543210", "+919876543211"], type: [String], required: false })
  @IsOptional()
  @IsArray()
  recipients?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  scheduled_at?: Date;
}
