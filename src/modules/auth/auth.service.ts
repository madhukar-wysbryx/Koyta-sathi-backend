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

  async signup(phoneNumber: string, password: string, name: string, village: string) {
    const db = this.dbService.getDb();
    
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    
    if (existingUser.length > 0) {
      throw new BadRequestException('User already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const newUser = await db.insert(users).values({
      phoneNumber,
      password: hashedPassword,
      name: name || '',
      village: village || '',
      hasCompletedOnboarding: false,
    }).returning();
    
    // Generate token
    const token = this.jwtService.sign({ 
      userId: newUser[0].id, 
      phoneNumber: newUser[0].phoneNumber 
    });
    
    return {
      success: true,
      token,
      user: {
        id: newUser[0].id,
        phoneNumber: newUser[0].phoneNumber,
        name: newUser[0].name,
        village: newUser[0].village,
        hasCompletedOnboarding: newUser[0].hasCompletedOnboarding,
      },
    };
  }

  async login(phoneNumber: string, password: string) {
    const db = this.dbService.getDb();
    
    const user = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    
    if (!user.length) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const isPasswordValid = await bcrypt.compare(password, user[0].password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const token = this.jwtService.sign({ 
      userId: user[0].id, 
      phoneNumber: user[0].phoneNumber 
    });
    
    return {
      success: true,
      token,
      user: {
        id: user[0].id,
        phoneNumber: user[0].phoneNumber,
        name: user[0].name,
        village: user[0].village,
        hasCompletedOnboarding: user[0].hasCompletedOnboarding,
      },
    };
  }
}