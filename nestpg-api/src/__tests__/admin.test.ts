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

describe('admin API', () => {
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

  it('returns platform summaries and collections', async () => {
    const auth = { Authorization: `Bearer ${context.adminToken}` }
    const paths = [
      '/api/v1/admin/dashboard/summary',
      '/api/v1/admin/pgs',
      '/api/v1/admin/owners',
      '/api/v1/admin/users',
      '/api/v1/admin/enquiries',
      '/api/v1/admin/residents',
      '/api/v1/admin/owner-applications',
      '/api/v1/admin/balance-sheets',
      '/api/v1/admin/ledger/entries',
    ]

    const responses = await Promise.all(paths.map((path) => request(app).get(path).set(auth)))
    for (const response of responses) {
      expect(response.status, response.text).toBe(200)
    }
    expect(responses[0]?.body).toEqual(expect.objectContaining({
      pgs: expect.any(Number),
      owners: expect.any(Number),
      users: expect.any(Number),
      pending: expect.any(Number),
    }))
    for (const response of responses.slice(1)) {
      expect(response.body.items).toEqual(expect.any(Array))
    }
  })

  it('creates an owner, updates its status, and updates a listing status', async () => {
    const auth = { Authorization: `Bearer ${context.adminToken}` }
    const owner = await request(app)
      .post('/api/v1/admin/owners')
      .set(auth)
      .send({
        name: 'New Owner',
        email: 'new-owner@nestpg.test',
        phone: '9000000014',
        temporaryPassword: 'Temporary123',
      })

    expect(owner.status).toBe(201)
    expect(owner.body.ownerId).toBeTruthy()

    const status = await request(app)
      .patch(`/api/v1/admin/owners/${owner.body.ownerId}/status`)
      .set(auth)
      .send({ status: 'blocked' })
    expect(status.status).toBe(200)

    const listingStatus = await request(app)
      .patch(`/api/v1/admin/listings/${context.pgId}/status`)
      .set(auth)
      .send({ status: 'suspended' })
    expect(listingStatus.status).toBe(200)
    expect(listingStatus.body.status).toBe('suspended')
  })
})
