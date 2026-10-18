import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SendWhatsAppMessageModel {
  @ApiProperty({ example: "+919876543210" })
  @IsNotEmpty({ message: "Recipient phone number is required" })
  @IsString()
  to: string;

  @ApiProperty({ example: "Hello! How can we assist you today?", required: false })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ example: "text", required: false, default: "text" })
  @IsOptional()
  @IsString()
  message_type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  template_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  conversation_id?: string;
}
