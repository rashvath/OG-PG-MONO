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

describe('owner inventory API', () => {
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

  it('manages floors, rooms, and bed status for an assigned PG', async () => {
    const auth = { Authorization: `Bearer ${context.ownerToken}` }
    const basePath = `/api/v1/owner/pgs/${context.pgId}`

    const floor = await request(app)
      .post(`${basePath}/floors`)
      .set(auth)
      .send({ name: 'Ground Floor', level: 0 })
    expect(floor.status).toBe(201)

    const inventory = await request(app).get(`${basePath}/inventory`).set(auth)
    expect(inventory.status).toBe(200)
    expect(inventory.body.floors).toEqual(expect.arrayContaining([
      expect.objectContaining({ _id: floor.body._id, name: 'Ground Floor' }),
    ]))

    const room = await request(app)
      .post(`${basePath}/rooms`)
      .set(auth)
      .send({
        floorId: floor.body._id,
        roomNumber: '101',
        roomType: 'Double Sharing',
        totalBedCapacity: 2,
        monthlyRent: 12000,
      })
    expect(room.status).toBe(201)

    const updatedRoom = await request(app)
      .patch(`${basePath}/rooms/${room.body._id}`)
      .set(auth)
      .send({ roomNumber: '101A', monthlyRent: 12500 })
    expect(updatedRoom.status).toBe(200)
    expect(updatedRoom.body.roomNumber).toBe('101A')

    const rooms = await request(app).get(`${basePath}/rooms`).set(auth)
    expect(rooms.status).toBe(200)
    expect(rooms.body.rooms).toEqual(expect.arrayContaining([
      expect.objectContaining({ _id: room.body._id, roomNumber: '101A' }),
    ]))
    const bedId = rooms.body.rooms[0]?.beds[0]?._id as string | undefined
    expect(bedId).toBeTruthy()

    const bed = await request(app)
      .patch(`${basePath}/beds/${bedId}/status`)
      .set(auth)
      .send({ status: 'maintenance', maintenanceReason: 'Test maintenance' })
    expect(bed.status).toBe(200)
    expect(bed.body.status).toBe('maintenance')

    const emptyFloor = await request(app)
      .post(`${basePath}/floors`)
      .set(auth)
      .send({ name: 'Empty Floor', level: 1 })
    expect(emptyFloor.status).toBe(201)

    const deletedRoom = await request(app)
      .delete(`${basePath}/rooms/${room.body._id}`)
      .set(auth)
    expect(deletedRoom.status).toBe(200)

    const deletedFloor = await request(app)
      .delete(`${basePath}/floors/${emptyFloor.body._id}`)
      .set(auth)
    expect(deletedFloor.status).toBe(200)
  })
})
