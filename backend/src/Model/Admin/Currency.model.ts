import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty } from "class-validator";
import { BaseModel } from "../Base.model";

export class CurrencyModel extends BaseModel {

  @IsNotEmpty({ message: 'Currency name required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  name: string;

  @IsNotEmpty({ message: 'Currency code required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  code: string;

  @IsNotEmpty({ message: 'Currency symbol required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  symbol: string;

}

