import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEmail, IsNotEmpty } from "class-validator";
import { BaseModel } from "../Base.model";

export class CompanyModel extends BaseModel {

  @IsNotEmpty({ message: 'Company name required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  name: string;

  @IsNotEmpty({ message: 'Company address required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  address: string;

  @IsNotEmpty({ message: 'Country id required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  country_id: string;

  @IsNotEmpty({ message: 'Currency id required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  currency_id: string;

  @IsNotEmpty({ message: 'Postal Code required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  postal_code: string;

  @IsNotEmpty({ message: 'Email required' })
  @IsEmail({}, { message: 'Invaild Email format' })
  @ApiProperty({ required: true })
  @Type(() => String)
  email: string;

  @ApiProperty({ required: false })
  @Type(() => String)
  website: string;

  @ApiProperty({ required: false })
  @Type(() => String)
  uen_no: string;

  @ApiProperty({ required: false })
  @Type(() => String)
  bank_name: string;

  @ApiProperty({ required: false })
  @Type(() => String)
  bank_acct_no: string;

  @ApiProperty({ required: false })
  @Type(() => String)
  telephone_no: string;

  @ApiProperty({ required: false })
  @Type(() => String)
  fax_no: string;

  @Type(() => String)
  invoice_footer: string;

}
