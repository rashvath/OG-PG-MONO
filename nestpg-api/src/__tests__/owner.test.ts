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

describe('owner API', () => {
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

  it('returns dashboard, enquiry, and assigned PG data', async () => {
    const [summary, enquiries, pgs] = await Promise.all([
      request(app).get('/api/v1/owner/dashboard/summary').set('Authorization', `Bearer ${context.ownerToken}`),
      request(app).get('/api/v1/owner/enquiries').set('Authorization', `Bearer ${context.ownerToken}`),
      request(app).get('/api/v1/owner/pgs').set('Authorization', `Bearer ${context.ownerToken}`),
    ])

    expect(summary.status).toBe(200)
    expect(summary.body).toEqual(expect.objectContaining({
      activeListings: expect.any(Number),
      enquiries: expect.any(Number),
      activeResidents: expect.any(Number),
      availableBeds: expect.any(Number),
      occupancy: expect.any(Number),
    }))
    expect(enquiries.status).toBe(200)
    expect(enquiries.body.items).toEqual(expect.any(Array))
    expect(pgs.status).toBe(200)
    expect(pgs.body.items).toEqual(expect.any(Array))
    expect(pgs.body.items).toHaveLength(1)
  })

  it('creates, lists, and deletes ledger entries and balance sheets', async () => {
    const auth = { Authorization: `Bearer ${context.ownerToken}` }
    const entryDate = '2026-03-15'
    const entry = await request(app)
      .post('/api/v1/owner/ledger/entries')
      .set(auth)
      .send({
        pgId: context.pgId,
        entryType: 'income',
        category: 'Rent',
        amount: 12000,
        entryDate,
      })

    expect(entry.status).toBe(201)
    expect(entry.body).toMatchObject({ entryType: 'income', category: 'Rent', amount: 12000 })
    expect(new Date(entry.body.entryDate).toISOString().slice(0, 10)).toBe(entryDate)

    const listedEntries = await request(app).get('/api/v1/owner/ledger/entries').set(auth)
    expect(listedEntries.status).toBe(200)
    expect(listedEntries.body.items.some((item: { _id: string }) => item._id === entry.body._id)).toBe(true)

    const period = { periodStart: '2026-03-01', periodEnd: '2026-03-31', pgId: context.pgId }
    const preview = await request(app)
      .post('/api/v1/owner/balance-sheets/generate')
      .set(auth)
      .send(period)
    expect(preview.status).toBe(200)
    expect(preview.body).toMatchObject({ totalIncome: 12000, totalExpense: 0, netBalance: 12000 })

    const saved = await request(app)
      .post('/api/v1/owner/balance-sheets')
      .set(auth)
      .send({ ...period, title: 'March 2026' })
    expect(saved.status).toBe(201)

    const listedSheets = await request(app).get('/api/v1/owner/balance-sheets').set(auth)
    expect(listedSheets.status).toBe(200)
    expect(listedSheets.body.items.some((item: { _id: string }) => item._id === saved.body._id)).toBe(true)

    const singleSheet = await request(app)
      .get(`/api/v1/owner/balance-sheets/${saved.body._id}`)
      .set(auth)
    expect(singleSheet.status).toBe(200)
    expect(singleSheet.body._id).toBe(saved.body._id)

    const deletedSheet = await request(app)
      .delete(`/api/v1/owner/balance-sheets/${saved.body._id}`)
      .set(auth)
    expect(deletedSheet.status).toBe(200)

    const deletedEntry = await request(app)
      .delete(`/api/v1/owner/ledger/entries/${entry.body._id}`)
      .set(auth)
    expect(deletedEntry.status).toBe(200)
  })
})
