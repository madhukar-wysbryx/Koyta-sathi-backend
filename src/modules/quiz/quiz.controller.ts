import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubmitQuizDto } from '../../common/dto/submit-quiz.dto';

@Controller('quiz')
@UseGuards(JwtAuthGuard)
export class QuizController {
  constructor(private quizService: QuizService) {}

  @Get('questions')
  async getQuestions() {
    return this.quizService.getQuestions();
  }

  @Post('submit')
  async submitQuiz(
    @CurrentUser() user: { id: string },
    @Body() body: SubmitQuizDto
  ) {
    return this.quizService.submitQuiz(user.id, body.answers);
  }

  @Get('results')
  async getResults(@CurrentUser() user: { id: string }) {
    return this.quizService.getQuizResults(user.id);
  }

  @Get('best-score')
  async getBestScore(@CurrentUser() user: { id: string }) {
    return this.quizService.getBestScore(user.id);
  }
}