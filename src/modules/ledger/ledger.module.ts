import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';
import { DbService } from '../../db/db.service';

@Module({
  controllers: [LedgerController],
  providers: [LedgerService, DbService],
})
export class LedgerModule {}