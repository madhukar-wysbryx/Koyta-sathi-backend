import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AddLedgerEntryDto } from '../../common/dto/add-ledger-entry.dto';

@Controller('ledger')
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(private ledgerService: LedgerService) {}

  @Get()
  async getLedger(@CurrentUser() user: { id: string }) {
    return this.ledgerService.getLedger(user.id);
  }

  @Post('entry')
  async addTransaction(
    @CurrentUser() user: { id: string },
    @Body() body: AddLedgerEntryDto
  ) {
    return this.ledgerService.addTransaction(user.id, body);
  }

  @Get('warnings')
  async getWarnings(@CurrentUser() user: { id: string }) {
    return this.ledgerService.getWarnings(user.id);
  }

  @Post('warnings/:id/read')
  async markWarningRead(@Param('id') id: string) {
    return this.ledgerService.markWarningRead(id);
  }

  @Get('stats')
  async getStats(@CurrentUser() user: { id: string }) {
    return this.ledgerService.getStats(user.id);
  }
}