import { Controller, Post, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto.phoneNumber, dto.password, dto.name, dto.village);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.phoneNumber, dto.password);
  }

  @Get('test')
  test() {
    return { message: 'Backend is working!' };
  }
}
