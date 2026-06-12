import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const DATABASE_URL = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/mental_health'

// PrismaMariaDb 是工厂类，内部使用 mariadb 驱动
// 传 URL 字符串即可，connect() 由 Prisma 内部调用
const adapter = new PrismaMariaDb(DATABASE_URL)
export const prisma = new PrismaClient({ adapter })
