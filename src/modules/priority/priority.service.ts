// src/modules/priority/priority.service.ts
import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { priorityPlans, priorityItems, advances, users } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

@Injectable()
export class PriorityService {
  constructor(private dbService: DbService) {}

  async createPriorityPlan(userId: string, seasonYear: string, items: { itemName: string; estimatedAmount: number }[], priorityAdvanceAmount?: number) {
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
    
    const advanceLimit = priorityAdvanceAmount ?? totalAmount;

    // @ts-ignore
    const [advance] = await db.insert(advances).values({
      userId: userId,
      seasonYear: seasonYear,
      plannedAmount: totalAmount.toString(),
      priorityAdvanceAmount: advanceLimit.toString(),
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
      { id: 1, name: "📚 Children's School Fees", defaultAmount: 5000, description: "School fees, books, uniform" },
      { id: 2, name: "💊 Medicine & Healthcare", defaultAmount: 3000, description: "Doctor, medicine, hospital" },
      { id: 3, name: "🏠 House Repairs", defaultAmount: 10000, description: "Roof, door, electricity repair" },
      { id: 4, name: "🌾 Farm Work", defaultAmount: 7000, description: "Seeds, fertilizer, labour" },
      { id: 5, name: "🎉 Festival Expenses", defaultAmount: 4000, description: "Diwali, Ganesh festival" },
      { id: 6, name: "🆘 Emergency Fund", defaultAmount: 5000, description: "Unexpected expenses" },
      { id: 7, name: "🍚 Daily Food & Groceries", defaultAmount: 8000, description: "Grocery, ration" },
      { id: 8, name: "🚜 Vehicle Maintenance", defaultAmount: 3000, description: "Vehicle repair" },
    ];
  }

  async savePrioritizingGame(userId: string, items: { itemName: string; isMustHave: boolean }[]) {
    const db = this.dbService.getDb();
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

  async generateBudgetPdf(userId: string): Promise<Buffer> {
    const db = this.dbService.getDb();

    // Fetch user
    // @ts-ignore
    const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = userRows[0];

    // Fetch active plan + items
    // @ts-ignore
    const planRows = await db.select().from(priorityPlans)
      .where(and(eq(priorityPlans.userId, userId), eq(priorityPlans.isActive, true)))
      .orderBy(desc(priorityPlans.createdAt)).limit(1);

    if (!planRows.length) throw new Error('No active priority plan found.');
    const plan = planRows[0];

    // @ts-ignore
    const items = await db.select().from(priorityItems)
      .where(eq(priorityItems.priorityPlanId, plan.id))
      .orderBy(priorityItems.priorityOrder);

    // Fetch advance
    // @ts-ignore
    const advanceRows = await db.select().from(advances)
      .where(and(eq(advances.userId, userId), eq(advances.seasonYear, plan.seasonYear)))
      .limit(1);
    const advance = advanceRows[0];

    // Fetch last 2 seasons of past season data for arrears
    const { pastSeasonData } = await import('../../db/schema');
    // @ts-ignore
    const pastSeasons = await db.select().from(pastSeasonData)
      .where(eq(pastSeasonData.userId, userId))
      .orderBy(desc(pastSeasonData.seasonYear))
      .limit(2);

    const totalArrears = pastSeasons.reduce((sum: number, s: any) => sum + Number(s.arrearsAmount || 0), 0);
    const priorityAdvance = Number(advance?.priorityAdvanceAmount || advance?.plannedAmount || 0);
    const totalBorrowingGoal = priorityAdvance + totalArrears;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const GREEN = '#2d6a4f';
      const LIGHT = '#f0fdf4';
      const GRAY = '#6b7280';
      const pageWidth = doc.page.width - 100;

      // ── Header ──
      doc.rect(0, 0, doc.page.width, 80).fill(GREEN);
      doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
        .text('Koyta-Sathi', 50, 20);
      doc.fontSize(11).font('Helvetica')
        .text(`${plan.seasonYear} Season Budget Plan`, 50, 48);
      doc.fillColor(GRAY).fontSize(9)
        .text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 400, 48, { align: 'right', width: pageWidth - 350 });

      doc.moveDown(3);

      // ── User info ──
      doc.fillColor('#111827').fontSize(13).font('Helvetica-Bold')
        .text(`Name: ${user?.name || '—'}`, 50, 100);
      doc.fontSize(11).font('Helvetica').fillColor(GRAY)
        .text(`Village: ${user?.village || '—'}   |   Phone: ${user?.phoneNumber || '—'}`, 50, 118);

      // Divider
      doc.moveTo(50, 140).lineTo(50 + pageWidth, 140).strokeColor('#d1fae5').lineWidth(1.5).stroke();

      // ── Total Borrowing Goal box ──
      doc.rect(50, 150, pageWidth, totalArrears > 0 ? 90 : 60).fill(LIGHT).stroke('#bbf7d0');

      doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold').text('Total Borrowing Goal', 65, 162);
      doc.fontSize(22).fillColor(GREEN)
        .text(`Rs. ${totalBorrowingGoal.toLocaleString('en-IN')}`, 65, 178);

      if (totalArrears > 0) {
        // Breakdown: priority advance + arrears
        doc.fillColor(GRAY).fontSize(9).font('Helvetica')
          .text(`Planned Advance:  Rs. ${priorityAdvance.toLocaleString('en-IN')}`, 65, 208);
        doc.text(`Arrears from last ${pastSeasons.length} season(s):  Rs. ${totalArrears.toLocaleString('en-IN')}`, 65, 220);
        // Per-season arrears detail
        pastSeasons.forEach((s: any, i: number) => {
          const arr = Number(s.arrearsAmount || 0);
          if (arr > 0) {
            doc.text(`  • ${s.seasonYear} season arrears: Rs. ${arr.toLocaleString('en-IN')}`, 75, 232 + i * 11);
          }
        });
      } else {
        doc.fillColor(GRAY).fontSize(9).font('Helvetica')
          .text('This is your self-declared priority advance limit for the season.', 280, 170, { width: pageWidth - 240 });
      }

      const tableStartY = totalArrears > 0 ? 260 : 230;

      // ── Priority items table ──
      let y = tableStartY;
      doc.fillColor('#111827').fontSize(13).font('Helvetica-Bold').text('Priority Spending Plan', 50, y);
      y += 20;

      // Table header
      doc.rect(50, y, pageWidth, 22).fill(GREEN);
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
        .text('#', 58, y + 6)
        .text('Category', 80, y + 6)
        .text('Estimated Amount', 380, y + 6, { width: 150, align: 'right' });
      y += 22;

      let totalEstimated = 0;
      items.forEach((item: any, idx: number) => {
        const amt = Number(item.estimatedAmount);
        totalEstimated += amt;
        const rowBg = idx % 2 === 0 ? '#f9fafb' : 'white';
        doc.rect(50, y, pageWidth, 22).fill(rowBg);
        doc.fillColor('#111827').fontSize(10).font('Helvetica')
          .text(String(idx + 1), 58, y + 6)
          .text(item.itemName, 80, y + 6, { width: 280 })
          .text(`Rs. ${amt.toLocaleString('en-IN')}`, 380, y + 6, { width: 150, align: 'right' });
        y += 22;
        if (y > doc.page.height - 120) { doc.addPage(); y = 50; }
      });

      // Total row
      doc.rect(50, y, pageWidth, 24).fill(GREEN);
      doc.fillColor('white').fontSize(11).font('Helvetica-Bold')
        .text('Total Priority Expenses', 80, y + 6)
        .text(`Rs. ${totalEstimated.toLocaleString('en-IN')}`, 380, y + 6, { width: 150, align: 'right' });
      y += 34;

      // ── Disclaimer ──
      doc.rect(50, y, pageWidth, 50).fill('#fef9c3').stroke('#fde68a');
      doc.fillColor('#92400e').fontSize(9).font('Helvetica')
        .text(
          'IMPORTANT: This budget plan is a broad guide based on your stated priorities and advance goal. ' +
          'Actual spending will vary. Use this as a loose plan to help manage your advance over the season. ' +
          'Harvard Research Initiative & SOPPECOM.',
          58, y + 8, { width: pageWidth - 16 }
        );

      doc.end();
    });
  }
}