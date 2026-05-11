import { Controller, Get, Post, Body, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
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
    return this.priorityService.createPriorityPlan(user.id, body.seasonYear, body.items, body.priorityAdvanceAmount);
  }

  @Post('prioritizing-game')
  async savePrioritizingGame(
    @CurrentUser() user: { id: string },
    @Body('items') items: { itemName: string; isMustHave: boolean }[]
  ) {
    return this.priorityService.savePrioritizingGame(user.id, items);
  }

  @Get('budget-pdf')
  async downloadBudgetPdf(
    @CurrentUser() user: { id: string },
    @Res() res: Response
  ) {
    const buffer = await this.priorityService.generateBudgetPdf(user.id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="koyta-sathi-budget-plan.pdf"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}