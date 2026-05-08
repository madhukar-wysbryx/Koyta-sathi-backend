import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PriorityService } from './priority.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePriorityPlanDto } from '../../common/dto/create-priority-plan.dto';

@Controller('priority')
@UseGuards(JwtAuthGuard)
export class PriorityController {
  constructor(private priorityService: PriorityService) {}

  @Get('available')
  async getAvailablePriorities() {
    return this.priorityService.getAvailablePriorities();
  }

  @Get('current')
  async getCurrentPlan(@CurrentUser() user: { id: string }) {
    return this.priorityService.getCurrentPlan(user.id);
  }

  @Get('plan/:seasonYear')
  async getPriorityPlan(
    @CurrentUser() user: { id: string },
    @Body('seasonYear') seasonYear: string
  ) {
    return this.priorityService.getPriorityPlan(user.id, seasonYear);
  }

  @Post('plan')
  async createPriorityPlan(
    @CurrentUser() user: { id: string },
    @Body() body: CreatePriorityPlanDto
  ) {
    return this.priorityService.createPriorityPlan(user.id, body.seasonYear, body.items);
  }

  @Post('prioritizing-game')
  async savePrioritizingGame(
    @CurrentUser() user: { id: string },
    @Body('items') items: { itemName: string; isMustHave: boolean }[]
  ) {
    return this.priorityService.savePrioritizingGame(user.id, items);
  }
}