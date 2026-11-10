import ExcelJS from 'exceljs'
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

    const expense = await request(app)
      .post('/api/v1/owner/ledger/entries')
      .set(auth)
      .send({
        pgId: context.pgId,
        entryType: 'expense',
        category: 'Maintenance',
        amount: 350,
        entryDate: '2026-03-20',
        notes: 'Water pump repair',
      })
    expect(expense.status).toBe(201)

    const listedEntries = await request(app).get('/api/v1/owner/ledger/entries').set(auth)
    expect(listedEntries.status).toBe(200)
    expect(listedEntries.body.items.some((item: { _id: string }) => item._id === entry.body._id)).toBe(true)

    const period = { periodStart: '2026-03-01', periodEnd: '2026-03-31', pgId: context.pgId }
    const preview = await request(app)
      .post('/api/v1/owner/balance-sheets/generate')
      .set(auth)
      .send(period)
    expect(preview.status).toBe(200)
    expect(preview.body).toMatchObject({ totalIncome: 12000, totalExpense: 350, netBalance: 11650 })

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

    const exported = await request(app)
      .get(`/api/v1/owner/balance-sheets/${saved.body._id}/export`)
      .set(auth)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        response.on('end', () => callback(null, Buffer.concat(chunks)))
      })

    expect(exported.status).toBe(200)
    expect(exported.headers['content-type']).toContain('spreadsheetml.sheet')
    expect(exported.headers['content-disposition']).toContain('.xlsx')
    const workbook = new ExcelJS.Workbook()
    const exportBytes = new Uint8Array(exported.body)
    const workbookBuffer = new ArrayBuffer(exportBytes.length)
    new Uint8Array(workbookBuffer).set(exportBytes)
    await workbook.xlsx.load(workbookBuffer)
    const sheet = workbook.getWorksheet('Balance Sheet')
    expect(sheet).toBeDefined()
    expect(sheet?.getCell('A1').value).toBe('Test PG')
    expect(sheet?.getCell('A1').isMerged).toBe(true)
    expect(sheet?.getCell('A1').font?.size).toBe(16)
    expect(sheet?.getCell('A1').fill).toMatchObject({ fgColor: { argb: 'FF1E3A5F' } })
    expect(sheet?.getColumn(1).width).toBe(6)
    expect(sheet?.getColumn(6).width).toBe(16)
    expect(sheet?.getCell('A3').value).toBe('Period: 01 Mar 2026 – 31 Mar 2026')
    expect(sheet?.getCell('A6').value).toBe('INCOME')
    expect(sheet?.getCell('A7').value).toBe('#')
    expect(sheet?.getCell('B7').value).toBe('Date')
    expect(sheet?.getCell('F7').value).toBe('Amount (₹)')
    expect(sheet?.getCell('F8').value).toBe(12000)
    expect(sheet?.getCell('F8').numFmt).toBe('#,##0.00')
    expect(sheet?.getCell('A9').value).toBe('Total Income')
    expect(sheet?.getCell('A11').value).toBe('EXPENSES')
    expect(sheet?.getCell('C13').value).toBe('Water pump repair')
    expect(sheet?.getCell('A14').value).toBe('Total Expenses')
    expect(sheet?.getCell('F14').value).toBe(350)
    expect(sheet?.getCell('F16').value).toBe(11650)
    expect(sheet?.getCell('A16').value).toBe('Net Balance')

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
