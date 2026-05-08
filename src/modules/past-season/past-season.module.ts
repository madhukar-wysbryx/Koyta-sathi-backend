import { Module } from '@nestjs/common';
import { PastSeasonService } from './past-season.service';
import { PastSeasonController } from './past-season.controller';
import { DbService } from '../../db/db.service';

@Module({
  controllers: [PastSeasonController],
  providers: [PastSeasonService, DbService],
})
export class PastSeasonModule {}