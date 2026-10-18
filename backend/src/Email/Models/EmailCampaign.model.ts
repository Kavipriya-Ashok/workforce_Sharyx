import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { BaseModel } from "@Model/Base.model";

export class EmailCampaignModel extends BaseModel {
  @ApiProperty({ example: "Newsletter October 2026" })
  @IsNotEmpty({ message: "Campaign name is required" })
  @IsString()
  campaign_name: string;

  @ApiProperty({ example: "Important Updates for Your Account" })
  @IsNotEmpty({ message: "Subject is required" })
  @IsString()
  subject: string;

  @ApiProperty({ example: "<h1>Hello!</h1><p>Here are your updates.</p>" })
  @IsNotEmpty({ message: "HTML template is required" })
  @IsString()
  html_template: string;

  @ApiProperty({ example: ["user1@example.com", "user2@example.com"], type: [String] })
  @IsArray()
  recipients: string[];
}
