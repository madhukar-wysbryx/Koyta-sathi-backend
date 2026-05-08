import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PastSeasonService } from './past-season.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('past-season')
@UseGuards(JwtAuthGuard)
export class PastSeasonController {
  constructor(private pastSeasonService: PastSeasonService) {}

  @Get()
  async getPastSeasons(@CurrentUser() user: { id: string }) {
    return this.pastSeasonService.getPastSeasons(user.id);
  }

  @Get('options')
  async getSeasonOptions() {
    return this.pastSeasonService.getSeasonOptions();
  }

  @Get(':year')
  async getPastSeasonByYear(
    @CurrentUser() user: { id: string },
    @Param('year') year: string
  ) {
    return this.pastSeasonService.getPastSeasonByYear(user.id, year);
  }

  @Post()
  async addPastSeasonData(
    @CurrentUser() user: { id: string },
    @Body() body: { seasonYear: string; advanceTaken: number; daysWorked: number; arrearsAmount: number }
  ) {
    return this.pastSeasonService.addPastSeasonData(user.id, body);
  }
}