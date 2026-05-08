import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DbService } from '../../db/db.service';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private dbService: DbService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: { userId: string; phoneNumber: string }) {
    const db = this.dbService.getDb();
    const user = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    
    if (!user.length) {
      throw new UnauthorizedException('User not found');
    }
    
    return { id: user[0].id, phoneNumber: user[0].phoneNumber };
  }
}