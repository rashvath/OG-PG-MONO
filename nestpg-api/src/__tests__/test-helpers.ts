import bcrypt from 'bcryptjs'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import request from 'supertest'

import app from '../app'
import { ListingModel } from '../models/Listing'
import { OwnerProfileModel } from '../models/OwnerProfile'
import { PgOwnerAssignmentModel } from '../models/PgOwnerAssignment'
import { UserModel } from '../models/User'

const TEST_PASSWORD = 'Nestpg@123'

let replicaSet: MongoMemoryReplSet | undefined

export type TestContext = {
  adminId: string
  adminToken: string
  customerId: string
  customerToken: string
  ownerId: string
  ownerToken: string
  pgId: string
}

export async function startTestDatabase() {
  replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  await mongoose.connect(replicaSet.getUri())
}

export async function stopTestDatabase() {
  await mongoose.disconnect()
  await replicaSet?.stop()
  replicaSet = undefined
}

export async function seedTestData(): Promise<TestContext> {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4)
  const [admin, customer, owner] = await UserModel.create([
    {
      name: 'Test Admin',
      email: 'admin@nestpg.test',
      phone: '9000000001',
      passwordHash,
      role: 'admin',
    },
    {
      name: 'Test Customer',
      email: 'customer@nestpg.test',
      phone: '9000000002',
      passwordHash,
      role: 'customer',
    },
    {
      name: 'Test Owner',
      email: 'owner@nestpg.test',
      phone: '9000000003',
      passwordHash,
      role: 'owner',
    },
  ])

  if (!admin || !customer || !owner) {
    throw new Error('Unable to seed test users')
  }

  await OwnerProfileModel.create({
    userId: owner._id,
    phone: owner.phone,
    status: 'approved',
  })

  const listing = await ListingModel.create({
    ownerId: owner._id,
    name: 'Test PG',
    area: 'Koramangala',
    baseRent: 10000,
    gender: 'Men',
    status: 'live',
    roomTypes: [{ sharing: 'Double', rent: 10000, deposit: 20000 }],
  })

  await PgOwnerAssignmentModel.create({
    pgId: listing._id,
    ownerId: owner._id,
    assignedBy: admin._id,
  })

  const [adminLogin, customerLogin, ownerLogin] = await Promise.all([
    request(app).post('/api/v1/auth/login').send({ email: admin.email, password: TEST_PASSWORD }),
    request(app).post('/api/v1/auth/login').send({ email: customer.email, password: TEST_PASSWORD }),
    request(app).post('/api/v1/auth/login').send({ email: owner.email, password: TEST_PASSWORD }),
  ])

  for (const login of [adminLogin, customerLogin, ownerLogin]) {
    if (login.status !== 200 || typeof login.body.token !== 'string') {
      throw new Error(`Unable to get test login token: ${login.status}`)
    }
  }

  return {
    adminId: String(admin._id),
    adminToken: adminLogin.body.token as string,
    customerId: String(customer._id),
    customerToken: customerLogin.body.token as string,
    ownerId: String(owner._id),
    ownerToken: ownerLogin.body.token as string,
    pgId: String(listing._id),
  }
}

export async function clearTestData() {
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).deleteMany({})))
}

export { TEST_PASSWORD }
