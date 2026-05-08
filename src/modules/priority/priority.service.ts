// src/modules/priority/priority.service.ts
import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { priorityPlans, priorityItems, advances } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

@Injectable()
export class PriorityService {
  constructor(private dbService: DbService) {}

  async createPriorityPlan(userId: string, seasonYear: string, items: { itemName: string; estimatedAmount: number }[]) {
    const db = this.dbService.getDb();
    
    const totalAmount = items.reduce((sum, i) => sum + i.estimatedAmount, 0);
    
    // @ts-ignore
    const [plan] = await db.insert(priorityPlans).values({
      userId: userId,
      seasonYear: seasonYear,
      totalPriorityAmount: totalAmount.toString(),
      isActive: true,
    }).returning();
    
    for (let i = 0; i < items.length; i++) {
      // @ts-ignore
      await db.insert(priorityItems).values({
        priorityPlanId: plan.id,
        itemName: items[i].itemName,
        estimatedAmount: items[i].estimatedAmount.toString(),
        priorityOrder: i + 1,
      });
    }
    
    // @ts-ignore
    const [advance] = await db.insert(advances).values({
      userId: userId,
      seasonYear: seasonYear,
      plannedAmount: totalAmount.toString(),
      remainingAmount: totalAmount.toString(),
    }).returning();
    
    return { plan, advance, totalAmount };
  }

  async getPriorityPlan(userId: string, seasonYear: string) {
    const db = this.dbService.getDb();
    
    // @ts-ignore
    const plan = await db.select()
      .from(priorityPlans)
      .where(and(
        eq(priorityPlans.userId, userId),
        eq(priorityPlans.seasonYear, seasonYear)
      ))
      .limit(1);
    
    if (!plan.length) return null;
    
    // @ts-ignore
    const items = await db.select()
      .from(priorityItems)
      .where(eq(priorityItems.priorityPlanId, plan[0].id))
      .orderBy(priorityItems.priorityOrder);
    
    return { ...plan[0], items };
  }

  async getCurrentPlan(userId: string) {
    const db = this.dbService.getDb();
    
    // @ts-ignore
    const plan = await db.select()
      .from(priorityPlans)
      .where(and(
        eq(priorityPlans.userId, userId),
        eq(priorityPlans.isActive, true)
      ))
      .orderBy(desc(priorityPlans.createdAt))
      .limit(1);
    
    if (!plan.length) return null;
    
    // @ts-ignore
    const items = await db.select()
      .from(priorityItems)
      .where(eq(priorityItems.priorityPlanId, plan[0].id))
      .orderBy(priorityItems.priorityOrder);
    
    // @ts-ignore
    const advance = await db.select()
      .from(advances)
      .where(and(
        eq(advances.userId, userId),
        eq(advances.seasonYear, plan[0].seasonYear)
      ))
      .limit(1);
    
    return { ...plan[0], items, advance: advance[0] };
  }

  async getAvailablePriorities() {
    return [
      { id: 1, name: "📚 Baccho ki fees", defaultAmount: 5000, description: "School fees, books, uniform" },
      { id: 2, name: "💊 Dawaai aur ilaaj", defaultAmount: 3000, description: "Doctor, medicine, hospital" },
      { id: 3, name: "🏠 Ghar ki mending", defaultAmount: 10000, description: "Roof, door, electricity repair" },
      { id: 4, name: "🌾 Khet ka kaam", defaultAmount: 7000, description: "Seeds, fertilizer, labour" },
      { id: 5, name: "🎉 Festival mein kharch", defaultAmount: 4000, description: "Diwali, Ganesh festival" },
      { id: 6, name: "🆘 Emergency fund", defaultAmount: 5000, description: "Unexpected expenses" },
      { id: 7, name: "🍚 Roz ka khana", defaultAmount: 8000, description: "Grocery, ration" },
      { id: 8, name: "🚜 Gadhi ki maintenance", defaultAmount: 3000, description: "Vehicle repair" },
    ];
  }

  async savePrioritizingGame(userId: string, items: { itemName: string; isMustHave: boolean }[]) {
    const db = this.dbService.getDb();
    // Dynamically import to avoid circular dependency
    const { prioritizingGame } = await import('../../db/schema');
    
    for (const item of items) {
      // @ts-ignore
      await db.insert(prioritizingGame).values({
        userId: userId,
        itemName: item.itemName,
        isMustHave: item.isMustHave,
      });
    }
    
    return { success: true, count: items.length };
  }
}