import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

import { connectDb } from '../db/mongoose'
import { UserModel } from '../models/User'

const seedUsers = [
  {
    name: 'Customer Demo',
    email: 'customer@nestpg.com',
    phone: '9000000001',
    role: 'customer' as const,
    password: 'Nestpg@123',
  },
  {
    name: 'Owner Demo',
    email: 'owner@nestpg.com',
    phone: '9000000002',
    role: 'owner' as const,
    password: 'Nestpg@123',
  },
  {
    name: 'Admin Demo',
    email: 'admin@nestpg.com',
    phone: '9000000003',
    role: 'admin' as const,
    password: 'Nestpg@123',
  },
]

async function seedLogins() {
  await connectDb()

  for (const account of seedUsers) {
    const passwordHash = await bcrypt.hash(account.password, 10)

    await UserModel.findOneAndUpdate(
      { email: account.email },
      {
        name: account.name,
        email: account.email,
        phone: account.phone,
        role: account.role,
        status: 'active',
        passwordHash,
      },
      { upsert: true, setDefaultsOnInsert: true },
    )
  }

  console.log('Seeded 3 login users:')
  console.log('1) customer@nestpg.com / Nestpg@123')
  console.log('2) owner@nestpg.com / Nestpg@123')
  console.log('3) admin@nestpg.com / Nestpg@123')
}

seedLogins()
  .then(async () => {
    await mongoose.connection.close()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('Failed to seed login users', error)
    await mongoose.connection.close()
    process.exit(1)
  })
