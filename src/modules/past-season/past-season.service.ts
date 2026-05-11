// src/modules/past-season/past-season.service.ts
import { Injectable } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { pastSeasonData } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class PastSeasonService {
  constructor(private dbService: DbService) {}

  async addPastSeasonData(userId: string, data: {
    seasonYear: string;
    advanceTaken: number;
    daysWorked: number;
    arrearsAmount: number;
    plannedAdvance?: number;
  }) {
    const db = this.dbService.getDb();
    
    // @ts-ignore
    const [entry] = await db.insert(pastSeasonData).values({
      userId: userId,
      seasonYear: data.seasonYear,
      advanceTaken: data.advanceTaken.toString(),
      daysWorked: data.daysWorked,
      arrearsAmount: data.arrearsAmount.toString(),
      plannedAdvance: data.plannedAdvance ? data.plannedAdvance.toString() : null,
    }).returning();
    
    return entry;
  }

  async getPastSeasons(userId: string) {
    const db = this.dbService.getDb();
    // @ts-ignore
    const data = await db.select()
      .from(pastSeasonData)
      .where(eq(pastSeasonData.userId, userId))
      .orderBy(desc(pastSeasonData.seasonYear));
    
    return data;
  }

  async getPastSeasonByYear(userId: string, seasonYear: string) {
    const db = this.dbService.getDb();
    // @ts-ignore
    const data = await db.select()
      .from(pastSeasonData)
      .where(eq(pastSeasonData.userId, userId) && eq(pastSeasonData.seasonYear, seasonYear))
      .limit(1);
    
    return data[0] || null;
  }

  async getSeasonOptions() {
    const currentYear = new Date().getFullYear();
    return [
      { year: `${currentYear - 1}`, label: `${currentYear - 1} Season` },
      { year: `${currentYear - 2}`, label: `${currentYear - 2} Season` },
      { year: `${currentYear - 3}`, label: `${currentYear - 3} Season` },
    ];
  }
}