import { Injectable, OnModuleInit, OnModuleDestroy, Global } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

@Global()
@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  public db: any;
  private static isConnected = false; // 👈 Static flag - ek baar connect hoga

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1, 
    });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleInit() {
    if (!DbService.isConnected) {
      try {
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();
        DbService.isConnected = true;
        console.log('✅ PostgreSQL connected successfully');
      } catch (error) {
        console.error('❌ Database connection failed:', error);
      }
    }
  }

  async onModuleDestroy() {
    if (DbService.isConnected) {
      await this.pool.end();
      DbService.isConnected = false;
      console.log('🔌 Database connection closed');
    }
  }

  getDb() {
    return this.db;
  }
}