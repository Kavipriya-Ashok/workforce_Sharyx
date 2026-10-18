import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SendEmailModel {
  @ApiProperty({ example: "client@example.com" })
  @IsNotEmpty({ message: "Recipient email is required" })
  @IsEmail({}, { message: "Invalid recipient email" })
  to: string;

  @ApiProperty({ example: "Proposal for Cloud Services" })
  @IsNotEmpty({ message: "Subject is required" })
  @IsString()
  subject: string;

  @ApiProperty({ example: "<p>Hello, please find the proposal attached.</p>" })
  @IsNotEmpty({ message: "Email content is required" })
  @IsString()
  html: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lead_id?: string;
}
