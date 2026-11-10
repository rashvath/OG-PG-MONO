import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import app from '../app'
import { env } from '../config/env'
import {
  clearTestData,
  seedTestData,
  startTestDatabase,
  stopTestDatabase,
  TEST_PASSWORD,
  type TestContext,
} from './test-helpers'

describe('authentication API', () => {
  let context: TestContext

  beforeAll(async () => {
    await startTestDatabase()
    context = await seedTestData()
  })

  afterAll(async () => {
    await stopTestDatabase()
  })

  it('registers a customer and returns a usable token', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'New Customer',
      email: 'new-customer@nestpg.test',
      phone: '9000000010',
      password: TEST_PASSWORD,
      role: 'customer',
    })

    expect(response.status).toBe(201)
    expect(response.body.user).toMatchObject({ role: 'customer', name: 'New Customer' })
    expect(typeof response.body.token).toBe('string')

    const profile = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${response.body.token}`)
    expect(profile.status).toBe(200)
    expect(profile.body.email).toBe('new-customer@nestpg.test')
  })

  it('rejects duplicate email addresses', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'Duplicate',
      email: 'customer@nestpg.test',
      phone: '9000000011',
      password: TEST_PASSWORD,
      role: 'customer',
    })

    expect(response.status).toBe(409)
  })

  it('rejects missing registration fields', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({ email: 'missing@nestpg.test' })
    expect(response.status).toBe(400)
  })

  it('logs in valid credentials and returns the role', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'customer@nestpg.test',
      password: TEST_PASSWORD,
    })

    expect(response.status).toBe(200)
    expect(response.body.user.role).toBe('customer')
    expect(typeof response.body.token).toBe('string')
  })

  it('rejects an incorrect password', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'customer@nestpg.test',
      password: 'Wrong-password-123',
    })
    expect(response.status).toBe(401)
  })

  it('rejects an unknown email', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'unknown@nestpg.test',
      password: TEST_PASSWORD,
    })
    expect(response.status).toBe(401)
  })

  it('accepts a valid token on a protected owner route', async () => {
    const response = await request(app)
      .get('/api/v1/owner/dashboard/summary')
      .set('Authorization', `Bearer ${context.ownerToken}`)
    expect(response.status).toBe(200)
  })

  it('rejects a missing token', async () => {
    const response = await request(app).get('/api/v1/owner/dashboard/summary')
    expect(response.status).toBe(401)
  })

  it.each([
    ['expired', () => jwt.sign({ sub: context.customerId, role: 'customer' }, env.jwtSecret, { expiresIn: -1 })],
    ['tampered', () => `${context.customerToken}.tampered`],
  ])('rejects an %s token', async (_label, createToken) => {
    const response = await request(app)
      .get('/api/v1/owner/dashboard/summary')
      .set('Authorization', `Bearer ${createToken()}`)
    expect(response.status).toBe(401)
  })

  it('keeps test fixture ids valid MongoDB object ids', () => {
    expect(mongoose.isValidObjectId(context.ownerId)).toBe(true)
  })

  beforeEach(async () => {
    await clearTestData()
    context = await seedTestData()
  })
})
