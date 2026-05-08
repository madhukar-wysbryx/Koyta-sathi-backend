import { Module } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { DbService } from '../../db/db.service';

@Module({
  controllers: [QuizController],
  providers: [QuizService, DbService],
})
export class QuizModule {}