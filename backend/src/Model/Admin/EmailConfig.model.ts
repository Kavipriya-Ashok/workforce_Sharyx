import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, } from 'class-validator';
import { BaseModel } from '../Base.model';

export class EmailConfigModel extends BaseModel {

  @IsNotEmpty({ message: 'Email config email required' })
  @ApiProperty({ required: true })
  @IsEmail({}, { message: 'Invaild Email format' })
  @Type(() => String)
  email_id: string;

  @IsNotEmpty({ message: 'Email config password required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  password: string;

  @IsNotEmpty({ message: 'Email config mailer name required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  mailer_name: string;

  @IsNotEmpty({ message: 'Email config host required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  host: string;

}
