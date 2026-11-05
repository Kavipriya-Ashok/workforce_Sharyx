import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, MaxLength, ValidateIf } from 'class-validator';
import { IsStrongPassword, MatchesField, PASSWORD_MAX } from '../Auth/Auth.model';
import { BaseModel } from '../Base.model';

export class UserModel extends BaseModel {
  @IsNotEmpty({ message: 'User role required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  user_role_id: string;

  @IsNotEmpty({ message: 'First name required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  first_name: string;

  @ApiProperty({ required: false })
  @Type(() => String)
  last_name: string;

  @IsEmail({}, { message: 'Invaild Email format' })
  @IsNotEmpty({ message: 'Email required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  email: string;

  @ValidateIf((o: UserModel) => !(o.id > "0"))
  @IsNotEmpty({ message: 'Password required' })
  @ApiProperty({ required: true })
  @Type(() => String)
  password: string;

  @ApiProperty({ required: false })
  @Type(() => String)
  mobile: string;

}

export class ChangePasswordModel {

  @IsNotEmpty({ message: 'Password required' })
  @MaxLength(PASSWORD_MAX, { message: `Password must be at most ${PASSWORD_MAX} characters` })
  @ApiProperty({ required: true })
  @Type(() => String)
  old_password: string;

  @IsStrongPassword()
  @ApiProperty({ required: true })
  @Type(() => String)
  password: string;

  @MatchesField('password')
  @ApiProperty({ required: true })
  @Type(() => String)
  confirm_password: string;
}
