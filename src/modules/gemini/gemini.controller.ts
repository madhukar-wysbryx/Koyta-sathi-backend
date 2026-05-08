import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('gemini')
@UseGuards(JwtAuthGuard)
export class GeminiController {
  constructor(private geminiService: GeminiService) {}

  @Post('explain-quiz')
  async explainQuiz(
    @Body('question') question: string,
    @Body('userAnswer') userAnswer: string,
    @Body('correctAnswer') correctAnswer: string
  ) {
    return this.geminiService.explainQuizAnswer(question, userAnswer, correctAnswer);
  }

  @Post('budget-advice')
  async getBudgetAdvice(@Body() spendingData: any) {
    return this.geminiService.getBudgetAdvice(spendingData);
  }

  @Post('narrate-story')
  async narrateStory(@Body('story') story: string) {
    return this.geminiService.narrateStory(story);
  }

  @Post('voice-to-expense')
  async voiceToExpense(@Body('voiceText') voiceText: string) {
    return this.geminiService.voiceToExpense(voiceText);
  }

  @Post('welcome')
  async getWelcomeMessage(@CurrentUser() user: { id: string }, @Body('name') name: string) {
    return this.geminiService.generateWelcomeMessage(name);
  }
}