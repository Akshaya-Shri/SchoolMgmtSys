import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

let prisma: PrismaClient
let pool: pg.Pool

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: pg.Pool | undefined
}

if (!globalForPrisma.prisma) {
  pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })
  const adapter = new PrismaPg(pool)
  globalForPrisma.prisma = new PrismaClient({ adapter })
  globalForPrisma.pool = pool
}

prisma = globalForPrisma.prisma
pool = globalForPrisma.pool!

export { prisma, pool }
export * from '../generated/prisma/client.js'
