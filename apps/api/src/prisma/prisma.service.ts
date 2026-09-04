import { PrismaPg } from '@prisma/adapter-pg';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    super({ adapter: new PrismaPg(pool) });
    this.pool = pool;
  }

  async onModuleInit() {
    try {
      // Forces the TCP + Postgres handshake without running any SQL.
      const client = await this.pool.connect();
      client.release();
      this.logger.log('Connected to the database successfully');
    } catch (error) {
      this.logger.error(`Database connection failed: ${this.describeError(error)}`);
      process.exit(1);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    await this.$disconnect();
    this.logger.log('Disconnected from the database');
  }

  private describeError(error: unknown): string {
    if (error instanceof AggregateError) {
      return error.errors.map((e) => this.describeError(e)).join('; ');
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
