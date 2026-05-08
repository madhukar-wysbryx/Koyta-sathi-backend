import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private readonly logger = new Logger(GeminiService.name);

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not found in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async explainQuizAnswer(question: string, userAnswer: string, correctAnswer: string): Promise<string> {
    try {
      const prompt = `
        Question: ${question}
        User's answer: ${userAnswer}
        Correct answer: ${correctAnswer}
        
        Explain in very simple Hinglish (Hindi + English mix) in ONE short sentence why the correct answer is right.
        Be friendly, encouraging, and respectful. Don't use complex words.
      `;
      
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      this.logger.error('Gemini API error:', error);
      return "Beta, sahi jawab ye hai. Agli baar dhyaan se padhna!";
    }
  }

  async getBudgetAdvice(spendingData: any): Promise<string> {
    try {
      const prompt = `
        A sugarcane cutter in Maharashtra has these expenses this month:
        ${JSON.stringify(spendingData.expenses)}
        
        Their priority plan is: ${JSON.stringify(spendingData.priorityPlan)}
        
        Give 2 simple pieces of advice in Hinglish (very short, friendly, like an elder brother/sister):
        1. What they are doing well (ek cheez)
        2. What they can improve (ek cheez)
        
        Keep it under 2 sentences total.
      `;
      
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      this.logger.error('Gemini API error:', error);
      return "Aap achha kar rahe ho. Kharch pe nazar rakho aur zaroori cheezein pehle karo.";
    }
  }

  async narrateStory(storyText: string): Promise<string> {
    try {
      const prompt = `
        Convert this text into a short, spoken-style narration in Hinglish:
        
        "${storyText}"
        
        Make it sound like a friendly elder (Geeta Tai) is talking. 
        Keep it very simple, use words like "Beta", "Dekho".
        Maximum 3-4 sentences.
      `;
      
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      this.logger.error('Gemini API error:', error);
      return "Beta, budget banana mushkil nahi hai. Income aur expense ko track karo, phir dekho kahan bachat kar sakte ho.";
    }
  }

  async voiceToExpense(voiceText: string): Promise<any> {
    try {
      const prompt = `
        Parse this voice message into structured expense data for a budgeting app.
        
        Voice: "${voiceText}"
        
        Return ONLY JSON (no other text):
        {
          "amount": number (in rupees),
          "category": "food" | "medicine" | "fees" | "travel" | "other",
          "source": "mukaddam_advance" | "other_credit" | "own_savings",
          "description": string (short summary)
        }
      `;
      
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      return JSON.parse(cleanResponse);
    } catch (error) {
      this.logger.error('Gemini voice parsing error:', error);
      return { amount: 0, category: "other", source: "mukaddam_advance", description: voiceText };
    }
  }

  async generateWelcomeMessage(userName: string): Promise<string> {
    try {
      const prompt = `
        Generate a friendly welcome message in Hinglish for a sugarcane cutter named ${userName || 'bhai/bahan'}.
        They are using a budgeting app called Koyta-Sathi.
        Message should be warm, encouraging, and simple (2 sentences max).
      `;
      
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      return `Namaste ${userName || 'saheb'}! Koyta-Sathi mein aapka swagat hai.`;
    }
  }
}