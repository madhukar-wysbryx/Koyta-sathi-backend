import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class SignupDto {
  @IsString()
  @Matches(/^\d{10}$/, { message: 'phoneNumber must be 10 digits' })
  phoneNumber: string;

  @IsString()
  @Length(6, 100, { message: 'password must be at least 6 characters' })
  password: string;

  @IsString()
  @Length(2, 100, { message: 'firstName must be at least 2 characters' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'lastName is required' })
  lastName: string;

  @IsString()
  @IsNotEmpty()
  village: string;
}

export class LoginDto {
  @IsString()
  @Matches(/^\d{10}$/, { message: 'phoneNumber must be 10 digits' })
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
