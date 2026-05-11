import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: { id: string }) {
    return this.userService.getUser(user.id);
  }

  @Post('profile')
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() body: { firstName: string; lastName: string; village: string },
  ) {
    return this.userService.updateProfile(user.id, body);
  }

  @Post('complete-onboarding')
  async completeOnboarding(@CurrentUser() user: { id: string }) {
    return this.userService.completeOnboarding(user.id);
  }
}
