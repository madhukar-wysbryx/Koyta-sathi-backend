import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../../db/db.service';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UserService {
  constructor(private dbService: DbService) {}

  async updateProfile(userId: string, data: { firstName: string; lastName: string; village: string }) {
    const db = this.dbService.getDb();
    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();

    const [updated] = await db.update(users)
      .set({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        name: fullName,
        village: data.village,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async completeOnboarding(userId: string) {
    const db = this.dbService.getDb();
    const [updated] = await db.update(users)
      .set({ hasCompletedOnboarding: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getUser(userId: string) {
    const db = this.dbService.getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getAllUsers() {
    const db = this.dbService.getDb();
    return db.select().from(users);
  }
}
