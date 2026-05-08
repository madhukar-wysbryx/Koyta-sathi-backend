import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DbService } from './db/db.service';
import { JwtStrategy } from './common/strategies/jwt.strategy';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { PriorityModule } from './modules/priority/priority.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { PastSeasonModule } from './modules/past-season/past-season.module';
import { GeminiModule } from './modules/gemini/gemini.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '365d' },
    }),
    AuthModule,
    UserModule,
    QuizModule,
    PriorityModule,
    LedgerModule,
    PastSeasonModule,
    GeminiModule,
  ],
  providers: [DbService, JwtStrategy],  
  exports: [DbService],
})
export class AppModule {}