import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import app from '../app'
import {
  clearTestData,
  seedTestData,
  startTestDatabase,
  stopTestDatabase,
  type TestContext,
} from './test-helpers'

describe('role-based route access', () => {
  let context: TestContext

  beforeAll(async () => {
    await startTestDatabase()
    context = await seedTestData()
  })

  beforeEach(async () => {
    await clearTestData()
    context = await seedTestData()
  })

  afterAll(async () => {
    await stopTestDatabase()
  })

  it.each([
    ['GET', '/api/v1/owner/dashboard/summary'],
    ['POST', '/api/v1/owner/residents'],
    ['GET', '/api/v1/owner/balance-sheets'],
    ['POST', '/api/v1/owner/ledger/entries'],
    ['GET', '/api/v1/owner/pgs/000000000000000000000001/inventory'],
  ])('%s %s rejects admin and customer tokens', async (method, path) => {
    const send = (token: string) => {
      const req = request(app)[method.toLowerCase() as 'get' | 'post'](path)
      if (method === 'POST') req.send({})
      return req.set('Authorization', `Bearer ${token}`)
    }

    const [adminResponse, customerResponse, anonymousResponse] = await Promise.all([
      send(context.adminToken),
      send(context.customerToken),
      request(app)[method.toLowerCase() as 'get' | 'post'](path).send({}),
    ])
    expect(adminResponse.status).toBe(403)
    expect(customerResponse.status).toBe(403)
    expect(anonymousResponse.status).toBe(401)
  })

  it.each([
    ['GET', '/api/v1/admin/dashboard/summary'],
    ['GET', '/api/v1/admin/owners'],
    ['GET', '/api/v1/admin/balance-sheets'],
    ['GET', '/api/v1/admin/ledger/entries'],
    ['POST', '/api/v1/admin/owner-applications/000000000000000000000001/approve'],
  ])('%s %s rejects owner and customer tokens', async (method, path) => {
    const send = (token: string) => {
      const req = request(app)[method.toLowerCase() as 'get' | 'post'](path)
      if (method === 'POST') req.send({})
      return req.set('Authorization', `Bearer ${token}`)
    }

    const [ownerResponse, customerResponse, anonymousResponse] = await Promise.all([
      send(context.ownerToken),
      send(context.customerToken),
      request(app)[method.toLowerCase() as 'get' | 'post'](path).send({}),
    ])
    expect(ownerResponse.status).toBe(403)
    expect(customerResponse.status).toBe(403)
    expect(anonymousResponse.status).toBe(401)
  })

  it('allows public listing endpoints without authentication', async () => {
    const [listings, listing] = await Promise.all([
      request(app).get('/api/v1/listings'),
      request(app).get('/api/v1/listings/000000000000000000000001'),
    ])

    expect(listings.status).toBe(200)
    expect(listing.status).toBe(404)
  })
})
