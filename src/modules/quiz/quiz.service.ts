import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { quizQuestions, quizAttempts } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

const QUIZ_DATA = [
  {
    questionText: "Budget banana ka pehla step kya hai?",
    optionA: "Kharch karne lag jao",
    optionB: "Financial goals set karna",
    optionC: "Dusro se udhaar lena",
    optionD: "Kuch mat karo",
    correctAnswer: "option_b",
    explanation: "Pehle goal set karo, fir plan banao! Isse pata chalega ki tumhe kitna paisa chahiye."
  },
  {
    questionText: "Geeta Tai budget follow kaise karti hai?",
    optionA: "Yaad rakh kar",
    optionB: "Kuch nahi karti",
    optionC: "Income aur spending ko track karke",
    optionD: "Sirf soch kar",
    correctAnswer: "option_c",
    explanation: "Geeta Tai likh kar track karti hai — plan vs actual! Isse pata chal jata hai ki kahan zyada kharch ho raha hai."
  },
  {
    questionText: "Agar expenses income se zyada hai toh kya karna chahiye?",
    optionA: "Aur udhaar lo",
    optionB: "Expenses kam karo",
    optionC: "Kuch mat karo",
    optionD: "Gussa karo",
    correctAnswer: "option_b",
    explanation: "Expenses kam karna ya income badhana — do hi raaste hain! Pehle dekho kahan kam kar sakte ho."
  },
  {
    questionText: "Budget mein saving ka step kaunsa hai?",
    optionA: "Pehla",
    optionB: "Doosra",
    optionC: "Teesra",
    optionD: "Aakhri",
    correctAnswer: "option_c",
    explanation: "Income estimate karne ke baad saving decide karo! Pehle bachao, fir kharch karo."
  },
  {
    questionText: "Priority plan mein sabse pehle kya karna chahiye?",
    optionA: "Naya phone lena",
    optionB: "Zaroori cheezein identify karna",
    optionC: "Chhutti ki planning",
    optionD: "Dosto ko khilana",
    correctAnswer: "option_b",
    explanation: "Pehle dekho — khana, dawa, fees jaise zaroori kaam. Baki cheezein baad mein."
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
      passed: score >= 3,
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