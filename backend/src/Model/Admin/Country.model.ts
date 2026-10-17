import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty } from "class-validator";
import { BaseModel } from "../Base.model";

export class CountryModel extends BaseModel {

  @IsNotEmpty({ message: 'Country name required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  name: string;

  @IsNotEmpty({ message: 'Country code required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  code: string;

  @IsNotEmpty({ message: 'Currency id required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  currency_id: string;

}
