import { PrismaClient } from '@prisma/client'

let prisma

// Prevent multiple PrismaClient instances in dev with nodemon
if (process.env.NODE_ENV !== 'production') {
  if (!globalThis.__prisma) {
    globalThis.__prisma = new PrismaClient()
  }
  prisma = globalThis.__prisma
} else {
  prisma = new PrismaClient()
}

export default prisma
