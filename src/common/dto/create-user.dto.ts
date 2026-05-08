import { IsString, IsOptional, IsPhoneNumber, Length } from 'class-validator';

export class CreateUserDto {
  @IsPhoneNumber('IN')
  phoneNumber: string;

  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @IsOptional()
  village?: string;
}