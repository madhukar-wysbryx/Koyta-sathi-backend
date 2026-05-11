import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DbService } from '../../db/db.service';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private dbService: DbService,
    private jwtService: JwtService,
  ) {}

  async signup(phoneNumber: string, password: string, firstName: string, lastName: string, village: string) {
    const db = this.dbService.getDb();

    const existing = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    if (existing.length > 0) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    const [newUser] = await db.insert(users).values({
      phoneNumber,
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: fullName,
      village: village || '',
      hasCompletedOnboarding: false,
    }).returning();

    const token = this.jwtService.sign({ userId: newUser.id, phoneNumber: newUser.phoneNumber });

    return {
      success: true,
      token,
      user: {
        id: newUser.id,
        phoneNumber: newUser.phoneNumber,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        name: newUser.name,
        village: newUser.village,
        hasCompletedOnboarding: newUser.hasCompletedOnboarding,
      },
    };
  }

  async login(phoneNumber: string, password: string) {
    const db = this.dbService.getDb();

    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({ userId: user.id, phoneNumber: user.phoneNumber });

    return {
      success: true,
      token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        village: user.village,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
      },
    };
  }
}
