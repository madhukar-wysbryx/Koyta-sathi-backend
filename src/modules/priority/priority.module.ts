import { Module } from '@nestjs/common';
import { PriorityService } from './priority.service';
import { PriorityController } from './priority.controller';
import { DbService } from '../../db/db.service';

@Module({
  controllers: [PriorityController],
  providers: [PriorityService, DbService],
})
export class PriorityModule {}