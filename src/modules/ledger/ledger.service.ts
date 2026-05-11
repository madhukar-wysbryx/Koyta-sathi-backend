// src/modules/ledger/ledger.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { advanceLedger, advances, warningLogs } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class LedgerService {
  constructor(private dbService: DbService) {}

  async addTransaction(userId: string, data: {
    type: 'taken' | 'repaid';
    amount: number;
    purpose?: string;
    date: string;
  }) {
    const db = this.dbService.getDb();
    
    if (data.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    
    // @ts-ignore - Drizzle query issue
    let currentAdvance = await db.select()
      .from(advances)
      .where(eq(advances.userId, userId))
      .orderBy(desc(advances.createdAt))
      .limit(1);
    
    if (!currentAdvance.length) {
      throw new BadRequestException('No advance plan found. Please create a priority plan first.');
    }
    
    let newRemainingAmount = Number(currentAdvance[0].remainingAmount);
    let newTakenAmount = Number(currentAdvance[0].totalTakenAmount);
    let newRepaidAmount = Number(currentAdvance[0].totalRepaidAmount);
    
    if (data.type === 'taken') {
      newRemainingAmount += data.amount;
      newTakenAmount += data.amount;
    } else {
      if (newRemainingAmount < data.amount) {
        throw new BadRequestException(`Cannot repay more than remaining amount. Remaining: ₹${newRemainingAmount}`);
      }
      newRemainingAmount -= data.amount;
      newRepaidAmount += data.amount;
    }
    
    const plannedAmount = Number(currentAdvance[0].plannedAmount);
    const priorityAdvanceAmount = Number(currentAdvance[0].priorityAdvanceAmount) || plannedAmount;
    let visualPercentage = (newRemainingAmount / plannedAmount) * 100;
    visualPercentage = Math.min(Math.max(visualPercentage, 0), 100);
    
    // @ts-ignore - Drizzle insert issue
    const [entry] = await db.insert(advanceLedger).values({
      userId: userId,
      advanceId: currentAdvance[0].id,
      type: data.type,
      amount: data.amount.toString(),
      purpose: data.purpose || (data.type === 'taken' ? 'General advance' : 'Monthly repayment'),
      remainingBalance: newRemainingAmount.toString(),
      visualPercentage: Math.round(visualPercentage),
      date: new Date(data.date),
    }).returning();
    
    // @ts-ignore - Drizzle update issue
    await db.update(advances)
      .set({ 
        remainingAmount: newRemainingAmount.toString(),
        totalTakenAmount: newTakenAmount.toString(),
        totalRepaidAmount: newRepaidAmount.toString(),
        updatedAt: new Date()
      })
      .where(eq(advances.id, currentAdvance[0].id));

    // Warn against priorityAdvanceAmount (the self-declared limit)
    const usagePct = (newTakenAmount / priorityAdvanceAmount) * 100;
    if (data.type === 'taken') {
      if (usagePct >= 100) {
        // @ts-ignore
        await db.insert(warningLogs).values({
          userId: userId,
          advanceId: currentAdvance[0].id,
          warningType: 'exceeded_limit',
          currentAmount: newTakenAmount.toString(),
          limitAmount: priorityAdvanceAmount.toString(),
          isRead: false,
        });
      } else if (usagePct >= 80) {
        // @ts-ignore
        await db.insert(warningLogs).values({
          userId: userId,
          advanceId: currentAdvance[0].id,
          warningType: 'approaching_limit',
          currentAmount: newTakenAmount.toString(),
          limitAmount: priorityAdvanceAmount.toString(),
          isRead: false,
        });
      }
    }
    
    return entry;
  }

  async getLedger(userId: string) {
    const db = this.dbService.getDb();
    
    // @ts-ignore
    const transactions = await db.select()
      .from(advanceLedger)
      .where(eq(advanceLedger.userId, userId))
      .orderBy(desc(advanceLedger.date));
    
    // @ts-ignore
    const currentAdvance = await db.select()
      .from(advances)
      .where(eq(advances.userId, userId))
      .orderBy(desc(advances.createdAt))
      .limit(1);
    
    let summary = null;
    if (currentAdvance.length) {
      const remaining = Number(currentAdvance[0].remainingAmount);
      const planned = Number(currentAdvance[0].plannedAmount);
      const priorityAdvance = Number(currentAdvance[0].priorityAdvanceAmount);
      summary = {
        totalAdvance: Number(currentAdvance[0].totalTakenAmount),
        totalRepaid: Number(currentAdvance[0].totalRepaidAmount),
        remaining: remaining,
        plannedAmount: planned,
        priorityAdvance: priorityAdvance,
        visualPercentage: planned > 0 ? Math.round((remaining / planned) * 100) : 0,
      };
    }
    
    return { transactions, summary };
  }

  async getWarnings(userId: string) {
    const db = this.dbService.getDb();
    // @ts-ignore
    const warnings = await db.select()
      .from(warningLogs)
      .where(eq(warningLogs.userId, userId))
      .orderBy(desc(warningLogs.createdAt))
      .limit(1);

    if (!warnings.length || warnings[0].isRead) return { message: null };

    const w = warnings[0];
    const current = Number(w.currentAmount).toLocaleString('en-IN');
    const limit = Number(w.limitAmount).toLocaleString('en-IN');
    const message = w.warningType === 'exceeded_limit'
      ? `You have exceeded your priority advance limit. Taken ₹${current} of ₹${limit} limit.`
      : `You are approaching your priority advance limit. Taken ₹${current} of ₹${limit} limit.`;

    return { message, warningType: w.warningType, id: w.id };
  }

  async markWarningRead(warningId: string) {
    const db = this.dbService.getDb();
    // @ts-ignore
    await db.update(warningLogs)
      .set({ isRead: true })
      .where(eq(warningLogs.id, warningId));
    
    return { success: true };
  }

  async getStats(userId: string) {
    const db = this.dbService.getDb();
    
    // @ts-ignore
    const allAdvances = await db.select()
      .from(advances)
      .where(eq(advances.userId, userId));
    
    const totalBorrowed = allAdvances.reduce((sum: number, a: any) => sum + Number(a.totalTakenAmount), 0);
    const totalRepaid = allAdvances.reduce((sum: number, a: any) => sum + Number(a.totalRepaidAmount), 0);
    const currentRemaining = allAdvances.length > 0 ? Number(allAdvances[0].remainingAmount) : 0;
    
    return {
      totalBorrowed,
      totalRepaid,
      currentRemaining,
      seasonsCount: allAdvances.length,
    };
  }
}