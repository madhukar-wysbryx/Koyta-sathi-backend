import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { quizQuestions, quizAttempts } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

const QUIZ_DATA = [
  {
    questionText: "What is the first step to making a budget?",
    optionA: "Start spending right away",
    optionB: "Set financial goals",
    optionC: "Borrow money from others",
    optionD: "Do nothing",
    correctAnswer: "option_b",
    explanation: "Set your goals first, then make a plan. This helps you understand how much money you need."
  },
  {
    questionText: "How does Geeta Tai follow her budget?",
    optionA: "By remembering everything",
    optionB: "She does not follow one",
    optionC: "By tracking her income and spending",
    optionD: "By thinking about it",
    correctAnswer: "option_c",
    explanation: "Geeta Tai writes things down and tracks her plan vs what actually happens. This helps her see where she is spending too much."
  },
  {
    questionText: "If your expenses are more than your income, what should you do?",
    optionA: "Borrow more money",
    optionB: "Reduce your expenses",
    optionC: "Do nothing",
    optionD: "Get angry",
    correctAnswer: "option_b",
    explanation: "Reducing expenses or increasing income are the two options. First look at where you can cut back."
  },
  {
    questionText: "Which step in budgeting involves deciding how much to save?",
    optionA: "First step",
    optionB: "Second step",
    optionC: "Third step",
    optionD: "Last step",
    correctAnswer: "option_c",
    explanation: "After estimating your income, decide how much to save. Save first, then spend."
  },
  {
    questionText: "What should you do first when making a priority plan?",
    optionA: "Buy a new phone",
    optionB: "Identify the most essential needs",
    optionC: "Plan a holiday",
    optionD: "Treat your friends",
    correctAnswer: "option_b",
    explanation: "First identify essential needs like food, medicine, and school fees. Other things can come later."
  }
];

@Injectable()
export class QuizService {
  constructor(private dbService: DbService) {}

  async getQuestions() {
    const db = this.dbService.getDb();
    let questions = await db.select().from(quizQuestions);
    
    if (!questions.length) {
      questions = await db.insert(quizQuestions).values(QUIZ_DATA).returning();
    }
    
    return questions.map(q => ({
      id: q.id,
      questionText: q.questionText,
      options: [q.optionA, q.optionB, q.optionC, q.optionD],
      correctAnswer: q.correctAnswer,
    }));
  }

  async submitQuiz(userId: string, answers: Record<string, string>) {
    const db = this.dbService.getDb();
    const questions = await db.select().from(quizQuestions);
    
    let score = 0;
    const wrongDetails = [];
    
    for (const q of questions) {
      const userAnswer = answers[q.id];
      if (userAnswer === q.correctAnswer) {
        score++;
      } else {
        wrongDetails.push({
          question: q.questionText,
          options: [q.optionA, q.optionB, q.optionC, q.optionD],
          userAnswer: userAnswer,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        });
      }
    }
    
    const [attempt] = await db.insert(quizAttempts).values({
      userId,
      score,
      totalQuestions: questions.length,
      answers,
      completedAt: new Date(),
    }).returning();
    
    return {
      attemptId: attempt.id,
      score,
      total: questions.length,
      percentage: Math.round((score / questions.length) * 100),
      wrongAnswers: wrongDetails,
      passed: score >= Math.ceil(questions.length / 2),
    };
  }

  async getQuizResults(userId: string) {
    const db = this.dbService.getDb();
    const attempts = await db.select()
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, userId))
      .orderBy(desc(quizAttempts.completedAt));
    
    return attempts;
  }

  async getBestScore(userId: string) {
    const db = this.dbService.getDb();
    const attempts = await db.select()
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, userId))
      .orderBy(desc(quizAttempts.score));
    
    return attempts[0] || null;
  }
}