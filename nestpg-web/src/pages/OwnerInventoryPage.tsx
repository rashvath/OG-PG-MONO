import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Layers3,
  LayoutGrid,
  LayoutTemplate,
  LoaderCircle,
  Percent,
  UserCheck,
  Wrench,
} from 'lucide-react'

import {
  createOwnerFloor,
  createOwnerRoom,
  deleteOwnerFloor,
  deleteOwnerRoom,
  getOwnerInventory,
  getOwnerPgs,
  getOwnerResidents,
  moveOwnerResident,
  updateOwnerBedStatus,
  updateOwnerFloor,
  updateOwnerRoom,
  vacateOwnerBed,
  type BedStatus,
  type OwnerBed,
  type OwnerFloor,
  type OwnerInventoryStats,
  type OwnerPg,
  type OwnerResident,
  type OwnerRoom,
} from '@/api/owner-api'
import { EmptyTableState } from '@/components/data-display/EmptyTableState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FilterDrawer } from '@/components/ui/FilterDrawer'
import { useFormConfig } from '@/hooks/use-form-config'
import { useToast } from '@/lib/toast'

const ACTIVE_RESIDENT_STATUSES = new Set<OwnerResident['status']>(['active', 'pending_verification', 'notice_period'])
const ROOM_TYPES: OwnerRoom['roomType'][] = ['Single Sharing', 'Double Sharing', 'Triple Sharing', 'Four Sharing', 'Custom']

type RoomStatus = 'active' | 'maintenance' | 'inactive'
type InventoryFilterState = {
  floorId: string
  bedStatus: BedStatus | 'all'
  roomType: OwnerRoom['roomType'] | 'all'
  search: string
  onlyWithAvailableBeds: boolean
}

const DEFAULT_FILTERS: InventoryFilterState = {
  floorId: '',
  bedStatus: 'all',
  roomType: 'all',
  search: '',
  onlyWithAvailableBeds: false,
}

const BED_STATUS_LABEL: Record<BedStatus, string> = {
  vacant: 'Vacant',
  occupied: 'Occupied',
  reserved: 'Reserved',
  maintenance: 'Maintenance',
}

type RoomVisualState = 'all-available' | 'fully-occupied' | 'partially-occupied' | 'maintenance' | 'reserved'

function getRoomVisualState(room: OwnerRoom): RoomVisualState {
  if (room.status === 'maintenance' || room.status === 'inactive') {
    return 'maintenance'
  }
  if (room.occupancy.total > 0 && room.occupancy.occupied >= room.occupancy.total) {
    return 'fully-occupied'
  }
  if (room.occupancy.reserved > 0 && room.occupancy.occupied === 0) {
    return 'reserved'
  }
  if (room.occupancy.occupied > 0 || room.occupancy.reserved > 0 || room.occupancy.maintenance > 0) {
    return 'partially-occupied'
  }
  return 'all-available'
}

function roomVisualStateClass(state: RoomVisualState) {
  if (state === 'all-available') return 'room-tile all-available'
  if (state === 'fully-occupied') return 'room-tile fully-occupied'
  if (state === 'maintenance') return 'room-tile maintenance'
  if (state === 'reserved') return 'room-tile reserved'
  return 'room-tile partially-occupied'
}

function bedTileClass(status: BedStatus) {
  if (status === 'occupied') return 'bed-tile occupied'
  if (status === 'reserved') return 'bed-tile reserved'
  if (status === 'maintenance') return 'bed-tile maintenance'
  return 'bed-tile vacant'
}

function formatDateInput(date?: string) {
  if (!date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function toCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

function parseApiError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

type LabelConfig = Pick<ReturnType<typeof useFormConfig>, 'isRequired' | 'getLabel'>

function renderConfiguredLabel(config: LabelConfig, fieldKey: string, fallback: string) {
  return (
    <>
      {config.getLabel(fieldKey, fallback)}
      {config.isRequired(fieldKey) ? <span className="required-mark"> *</span> : null}
    </>
  )
}

export function OwnerInventoryPage() {
  const toast = useToast()
  const floorConfig = useFormConfig('owner.floor')
  const roomConfig = useFormConfig('owner.room')
  const residentAddConfig = useFormConfig('owner.residentAdd')
  const bedVacateConfig = useFormConfig('owner.bedVacate')

  const inventoryRequestIdRef = useRef(0)
  const residentRequestIdRef = useRef(0)

  const [pgs, setPgs] = useState<OwnerPg[]>([])
  const [selectedPgId, setSelectedPgId] = useState('')

  const [inventoryStats, setInventoryStats] = useState<OwnerInventoryStats | null>(null)
  const [floors, setFloors] = useState<OwnerFloor[]>([])
  const [rooms, setRooms] = useState<OwnerRoom[]>([])
  const [residents, setResidents] = useState<OwnerResident[]>([])

  const [isInventoryLoading, setIsInventoryLoading] = useState(false)
  const [isResidentsLoading, setIsResidentsLoading] = useState(false)
  const [inventoryError, setInventoryError] = useState('')

  const [draftFilters, setDraftFilters] = useState<InventoryFilterState>(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<InventoryFilterState>(DEFAULT_FILTERS)
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const [selectedFloorId, setSelectedFloorId] = useState('')
  const [roomDetailDialog, setRoomDetailDialog] = useState<OwnerRoom | null>(null)
  const [draggingRoomId, setDraggingRoomId] = useState('')
  const [layoutSavingFloorId, setLayoutSavingFloorId] = useState('')

  const [isFloorModalOpen, setIsFloorModalOpen] = useState(false)
  const [editingFloor, setEditingFloor] = useState<OwnerFloor | null>(null)
  const [floorNameInput, setFloorNameInput] = useState('')
  const [floorLevelInput, setFloorLevelInput] = useState('')
  const [isSavingFloor, setIsSavingFloor] = useState(false)

  const [floorDeleteTarget, setFloorDeleteTarget] = useState<OwnerFloor | null>(null)
  const [isDeletingFloor, setIsDeletingFloor] = useState(false)

  const [roomDialogOpen, setRoomDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<OwnerRoom | null>(null)
  const [roomDeleteTarget, setRoomDeleteTarget] = useState<OwnerRoom | null>(null)
  const [isSavingRoom, setIsSavingRoom] = useState(false)
  const [isDeletingRoom, setIsDeletingRoom] = useState(false)

  const [roomForm, setRoomForm] = useState({
    floorId: '',
    roomNumber: '',
    roomType: 'Double Sharing' as OwnerRoom['roomType'],
    totalBedCapacity: 2,
    monthlyRent: 0,
    bathroomType: 'common' as 'attached' | 'common',
    acType: 'non-ac' as 'ac' | 'non-ac',
    description: '',
    status: 'active' as RoomStatus,
  })

  const [bedDialog, setBedDialog] = useState<{ room: OwnerRoom; bed: OwnerBed } | null>(null)
  const [maintenanceReason, setMaintenanceReason] = useState('')
  const [selectedResidentIdForBed, setSelectedResidentIdForBed] = useState('')
  const [vacateForm, setVacateForm] = useState({
    leavingDate: new Date().toISOString().slice(0, 10),
    reason: '',
    finalSettlementAmount: 0,
    finalSettlementPaid: false,
    notes: '',
    finalRoomCondition: '',
  })
  const [isUpdatingBed, setIsUpdatingBed] = useState(false)

  const selectedPg = useMemo(() => pgs.find((pg) => pg._id === selectedPgId) ?? null, [pgs, selectedPgId])

  const activeResidentByBedId = useMemo(() => {
    const map = new Map<string, OwnerResident>()
    residents.forEach((resident) => {
      if (resident.bedId && ACTIVE_RESIDENT_STATUSES.has(resident.status)) {
        map.set(resident.bedId, resident)
      }
    })
    return map
  }, [residents])

  const floorSummaries = useMemo(() => {
    const result = new Map<string, { rooms: number; totalBeds: number; occupied: number; vacant: number; reserved: number; maintenance: number }>()
    rooms.forEach((room) => {
      const key = room.floorId ?? ''
      const current = result.get(key) ?? { rooms: 0, totalBeds: 0, occupied: 0, vacant: 0, reserved: 0, maintenance: 0 }
      current.rooms += 1
      current.totalBeds += room.occupancy.total
      current.occupied += room.occupancy.occupied
      current.vacant += room.occupancy.vacant
      current.reserved += room.occupancy.reserved
      current.maintenance += room.occupancy.maintenance
      result.set(key, current)
    })
    return result
  }, [rooms])

  const roomsByFloor = useMemo(() => {
    const map = new Map<string, OwnerRoom[]>()
    rooms.forEach((room) => {
      const key = room.floorId ?? ''
      const list = map.get(key) ?? []
      list.push(room)
      map.set(key, list)
    })
    map.forEach((list) => {
      list.sort((a, b) => {
        const orderA = a.customOrder ?? Number.MAX_SAFE_INTEGER
        const orderB = b.customOrder ?? Number.MAX_SAFE_INTEGER
        if (orderA !== orderB) return orderA - orderB
        return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: 'base' })
      })
    })
    return map
  }, [rooms])

  const visualFloors = useMemo(
    () => [...floors].sort((a, b) => b.level - a.level || a.sortOrder - b.sortOrder),
    [floors],
  )

  const currentBedResident = useMemo(() => {
    if (!bedDialog) {
      return null
    }
    return activeResidentByBedId.get(bedDialog.bed._id) ?? null
  }, [bedDialog, activeResidentByBedId])

  const residentById = useMemo(() => {
    const map = new Map<string, OwnerResident>()
    residents.forEach((resident) => {
      map.set(resident._id, resident)
    })
    return map
  }, [residents])

  const selectedResidentForBed = useMemo(() => {
    if (!selectedResidentIdForBed) {
      return null
    }
    return residentById.get(selectedResidentIdForBed) ?? null
  }, [residentById, selectedResidentIdForBed])

  const movableResidents = useMemo(
    () => residents.filter((resident) => ACTIVE_RESIDENT_STATUSES.has(resident.status)),
    [residents],
  )

  useEffect(() => {
    if (!selectedPgId) {
      setSelectedFloorId('')
      return
    }
    if (floors.length === 0) {
      setSelectedFloorId('')
      return
    }
    if (!selectedFloorId || !floors.some((floor) => floor._id === selectedFloorId)) {
      setSelectedFloorId(floors[0]?._id ?? '')
    }
  }, [selectedPgId, floors, selectedFloorId])

  useEffect(() => {
    if (!roomDetailDialog) {
      return
    }
    const next = rooms.find((room) => room._id === roomDetailDialog._id)
    if (!next) {
      setRoomDetailDialog(null)
      return
    }
    if (next !== roomDetailDialog) {
      setRoomDetailDialog(next)
    }
  }, [rooms, roomDetailDialog])

  const loadInitial = async () => {
    try {
      const pgData = await getOwnerPgs()
      setPgs(pgData.items)
    } catch (error) {
      toast.error(parseApiError(error, 'Unable to load your PGs'))
    }
  }

  const loadInventory = async (pgId: string, filters: InventoryFilterState) => {
    const requestId = ++inventoryRequestIdRef.current
    setIsInventoryLoading(true)
    setInventoryError('')

    try {
      const data = await getOwnerInventory(pgId, {
        floorId: filters.floorId || undefined,
        bedStatus: filters.bedStatus === 'all' ? undefined : filters.bedStatus,
        roomType: filters.roomType === 'all' ? undefined : filters.roomType,
        search: filters.search.trim() || undefined,
        onlyWithAvailableBeds: filters.onlyWithAvailableBeds || undefined,
      })

      if (requestId !== inventoryRequestIdRef.current) {
        return
      }

      setInventoryStats(data.stats)
      setFloors(data.floors)
      setRooms(data.rooms)
    } catch (error) {
      if (requestId !== inventoryRequestIdRef.current) {
        return
      }
      const message = parseApiError(error, 'Unable to load inventory')
      setInventoryError(message)
      toast.error(message)
      setInventoryStats(null)
      setFloors([])
      setRooms([])
    } finally {
      if (requestId === inventoryRequestIdRef.current) {
        setIsInventoryLoading(false)
      }
    }
  }

  const loadResidents = async (pgId: string, options?: { silent?: boolean }) => {
    const requestId = ++residentRequestIdRef.current
    if (!options?.silent) {
      setIsResidentsLoading(true)
    }

    try {
      const data = await getOwnerResidents({ pgId })
      if (requestId !== residentRequestIdRef.current) {
        return
      }
      setResidents(data.items)
    } catch (error) {
      if (requestId !== residentRequestIdRef.current) {
        return
      }
      toast.error(parseApiError(error, 'Unable to load residents'))
    } finally {
      if (requestId === residentRequestIdRef.current && !options?.silent) {
        setIsResidentsLoading(false)
      }
    }
  }

  const refreshAfterMutation = async (
    options: { includeResidents?: boolean; successMessage?: string },
  ) => {
    if (!selectedPgId) {
      return
    }

    const refreshTasks: Array<Promise<unknown>> = [loadInventory(selectedPgId, appliedFilters)]
    if (options.includeResidents) {
      refreshTasks.push(loadResidents(selectedPgId, { silent: true }))
    }

    const result = await Promise.allSettled(refreshTasks)
    if (options.successMessage) {
      toast.success(options.successMessage)
    }

    const failed = result.some((entry) => entry.status === 'rejected')
    if (failed) {
      toast.warning('Saved, but latest dashboard data could not fully refresh. Please retry.')
    }
  }

  const resetModalsForPgSwitch = () => {
    setIsFloorModalOpen(false)
    setEditingFloor(null)
    setFloorNameInput('')
    setFloorLevelInput('')
    setFloorDeleteTarget(null)
    setRoomDialogOpen(false)
    setEditingRoom(null)
    setRoomDeleteTarget(null)
    setBedDialog(null)
  }

  useEffect(() => {
    loadInitial()
  }, [])

  useEffect(() => {
    if (!selectedPgId) {
      setInventoryStats(null)
      setFloors([])
      setRooms([])
      setResidents([])
      return
    }

    loadInventory(selectedPgId, appliedFilters)
  }, [selectedPgId, appliedFilters])

  useEffect(() => {
    if (!selectedPgId) {
      return
    }
    loadResidents(selectedPgId)
  }, [selectedPgId])

  const onSelectPg = (pgId: string) => {
    setSelectedPgId(pgId)
    setDraftFilters(DEFAULT_FILTERS)
    setAppliedFilters(DEFAULT_FILTERS)
    resetModalsForPgSwitch()
  }

  const onApplyFilters = () => {
    setAppliedFilters({
      ...draftFilters,
      search: draftFilters.search.trim(),
    })
  }

  const onResetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS)
    setAppliedFilters(DEFAULT_FILTERS)
  }

  const onOpenAddFloor = () => {
    if (!selectedPgId) {
      toast.warning('Select a PG first')
      return
    }
    setEditingFloor(null)
    setFloorNameInput('')
    setFloorLevelInput(String(floors.length))
    setIsFloorModalOpen(true)
  }

  const onOpenEditFloor = (floor: OwnerFloor) => {
    setEditingFloor(floor)
    setFloorNameInput(floor.name)
    setFloorLevelInput(String(floor.level))
    setIsFloorModalOpen(true)
  }

  const onSaveFloor = async () => {
    if (!selectedPgId) {
      return
    }

    const trimmed = floorNameInput.trim()
    if (floorConfig.isRequired('name') && !trimmed) {
      toast.warning('Floor name is required')
      return
    }

    if (
      floors.some((floor) => floor.name.toLowerCase() === trimmed.toLowerCase() && floor._id !== editingFloor?._id)
    ) {
      toast.warning('Floor name already exists for this PG')
      return
    }

    const parsedLevel = Number(floorLevelInput)
    const level = Number.isFinite(parsedLevel) ? Math.max(Math.round(parsedLevel), 0) : undefined

    setIsSavingFloor(true)
    try {
      if (editingFloor) {
        await updateOwnerFloor(selectedPgId, editingFloor._id, {
          name: trimmed,
          ...(level !== undefined ? { level, sortOrder: level } : {}),
        })
        setIsFloorModalOpen(false)
        setEditingFloor(null)
        await refreshAfterMutation({ successMessage: 'Floor updated' })
      } else {
        const created = await createOwnerFloor(selectedPgId, {
          name: trimmed,
          ...(level !== undefined ? { level, sortOrder: level } : {}),
        })
        setIsFloorModalOpen(false)
        setFloorNameInput('')
        setFloorLevelInput('')
        setDraftFilters((current) => ({ ...current, floorId: created._id }))
        setAppliedFilters((current) => ({ ...current, floorId: created._id }))
        await refreshAfterMutation({ successMessage: 'Floor added' })
      }
    } catch (error) {
      toast.error(parseApiError(error, 'Unable to save floor'))
    } finally {
      setIsSavingFloor(false)
    }
  }

  const onDeleteFloor = async () => {
    if (!selectedPgId || !floorDeleteTarget) {
      return
    }

    setIsDeletingFloor(true)
    try {
      await deleteOwnerFloor(selectedPgId, floorDeleteTarget._id)
      const deletedFloorId = floorDeleteTarget._id
      setFloorDeleteTarget(null)

      setDraftFilters((current) =>
        current.floorId === deletedFloorId ? { ...current, floorId: '' } : current,
      )
      setAppliedFilters((current) =>
        current.floorId === deletedFloorId ? { ...current, floorId: '' } : current,
      )

      await refreshAfterMutation({ successMessage: 'Floor deleted' })
    } catch (error) {
      toast.error(parseApiError(error, 'Unable to delete floor'))
    } finally {
      setIsDeletingFloor(false)
    }
  }

  const openCreateRoomDialog = (preferredFloorId?: string) => {
    if (!selectedPgId) {
      toast.warning('Select a PG first')
      return
    }

    if (floors.length === 0) {
      toast.warning('Add a floor first')
      return
    }

    const floorFromSelection = preferredFloorId && floors.some((floor) => floor._id === preferredFloorId)
      ? preferredFloorId
      : ''
    const resolvedFloorId = floorFromSelection || (floors.some((floor) => floor._id === appliedFilters.floorId)
      ? appliedFilters.floorId
      : floors[0]?._id ?? '')

    setEditingRoom(null)
    setRoomForm({
      floorId: resolvedFloorId,
      roomNumber: '',
      roomType: 'Double Sharing',
      totalBedCapacity: 2,
      monthlyRent: selectedPg?.baseRent ?? 0,
      bathroomType: 'common',
      acType: 'non-ac',
      description: '',
      status: 'active',
    })
    setRoomDialogOpen(true)
  }

  const openEditRoomDialog = (room: OwnerRoom) => {
    setEditingRoom(room)
    setRoomForm({
      floorId: room.floorId ?? '',
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      totalBedCapacity: room.totalBeds,
      monthlyRent: room.monthlyRent ?? 0,
      bathroomType: room.bathroomType ?? 'common',
      acType: room.acType ?? 'non-ac',
      description: room.description ?? '',
      status: room.status ?? 'active',
    })
    setRoomDialogOpen(true)
  }

  const onSaveRoom = async () => {
    if (!selectedPgId) {
      return
    }

    if ((roomConfig.isRequired('floorId') && !roomForm.floorId) || (roomConfig.isRequired('roomNumber') && !roomForm.roomNumber.trim())) {
      toast.warning('Floor and room number are required')
      return
    }

    if (!floors.some((floor) => floor._id === roomForm.floorId)) {
      toast.warning('Select a valid floor in this PG')
      return
    }

    setIsSavingRoom(true)
    try {
      if (editingRoom) {
        await updateOwnerRoom(selectedPgId, editingRoom._id, roomForm)
        setRoomDialogOpen(false)
        setEditingRoom(null)
        await refreshAfterMutation({ successMessage: 'Room updated' })
      } else {
        await createOwnerRoom(selectedPgId, roomForm)
        setRoomDialogOpen(false)
        await refreshAfterMutation({ successMessage: 'Room created' })
      }
    } catch (error) {
      toast.error(parseApiError(error, 'Unable to save room'))
    } finally {
      setIsSavingRoom(false)
    }
  }

  const onDeleteRoom = async () => {
    if (!selectedPgId || !roomDeleteTarget) {
      return
    }

    setIsDeletingRoom(true)
    try {
      await deleteOwnerRoom(selectedPgId, roomDeleteTarget._id)
      setRoomDeleteTarget(null)
      await refreshAfterMutation({ successMessage: 'Room deleted' })
    } catch (error) {
      toast.error(parseApiError(error, 'Unable to delete room'))
    } finally {
      setIsDeletingRoom(false)
    }
  }

  const openBedDialog = (room: OwnerRoom, bed: OwnerBed) => {
    setBedDialog({ room, bed })
    setSelectedResidentIdForBed('')

    setMaintenanceReason(bed.maintenanceReason ?? '')

    setVacateForm({
      leavingDate: new Date().toISOString().slice(0, 10),
      reason: '',
      finalSettlementAmount: 0,
      finalSettlementPaid: false,
      notes: '',
      finalRoomCondition: '',
    })
  }

  const onUpdateBedStatus = async (status: BedStatus) => {
    if (!selectedPgId || !bedDialog) {
      return
    }

    setIsUpdatingBed(true)
    try {
      await updateOwnerBedStatus(selectedPgId, bedDialog.bed._id, {
        status,
        maintenanceReason: status === 'maintenance' ? maintenanceReason.trim() : undefined,
        reservedForName: status === 'reserved' ? 'Reserved by owner' : undefined,
      })
      setBedDialog(null)
      await refreshAfterMutation({ successMessage: 'Bed status updated' })
    } catch (error) {
      toast.error(parseApiError(error, 'Unable to update bed status'))
    } finally {
      setIsUpdatingBed(false)
    }
  }

  const onAssignTenant = async () => {
    if (!selectedPgId || !bedDialog) {
      return
    }

    if (!selectedResidentIdForBed) {
      toast.warning('Select a tenant from People list')
      return
    }

    setIsUpdatingBed(true)
    try {
      await moveOwnerResident(selectedResidentIdForBed, {
        pgId: selectedPgId,
        roomId: bedDialog.room._id,
        bedId: bedDialog.bed._id,
      })

      setBedDialog(null)
      await refreshAfterMutation({ includeResidents: true, successMessage: 'Tenant assigned successfully' })
    } catch (error) {
      toast.error(parseApiError(error, 'Unable to assign tenant'))
    } finally {
      setIsUpdatingBed(false)
    }
  }

  const onVacateBed = async () => {
    if (!selectedPgId || !bedDialog) {
      return
    }

    if (bedVacateConfig.isRequired('leavingDate') && !vacateForm.leavingDate) {
      toast.warning('Leaving date is required')
      return
    }

    if (bedVacateConfig.isRequired('finalSettlementAmount') && vacateForm.finalSettlementAmount < 0) {
      toast.warning('Final settlement amount is required')
      return
    }

    setIsUpdatingBed(true)
    try {
      await vacateOwnerBed(selectedPgId, bedDialog.bed._id, vacateForm)
      setBedDialog(null)
      await refreshAfterMutation({ includeResidents: true, successMessage: 'Tenant vacated and bed marked available' })
    } catch (error) {
      toast.error(parseApiError(error, 'Unable to vacate bed'))
    } finally {
      setIsUpdatingBed(false)
    }
  }

  const onSelectFloorFromCard = (floorId: string) => {
    setSelectedFloorId(floorId)
    setDraftFilters((current) => ({ ...current, floorId }))
    setAppliedFilters((current) => ({ ...current, floorId }))
  }

  const onSwitchFloorLayoutMode = async (floor: OwnerFloor, layoutMode: 'grid' | 'custom') => {
    if (!selectedPgId || floor.layoutMode === layoutMode) {
      return
    }
    setLayoutSavingFloorId(floor._id)
    try {
      await updateOwnerFloor(selectedPgId, floor._id, { layoutMode })
      await refreshAfterMutation({ successMessage: `Layout set to ${layoutMode}` })
    } catch (error) {
      toast.error(parseApiError(error, 'Unable to update floor layout mode'))
    } finally {
      setLayoutSavingFloorId('')
    }
  }

  const persistCustomRoomOrder = async (floorId: string, nextRooms: OwnerRoom[]) => {
    if (!selectedPgId || nextRooms.length === 0) {
      return
    }

    setLayoutSavingFloorId(floorId)
    try {
      await Promise.all(
        nextRooms.map((room, index) =>
          updateOwnerRoom(selectedPgId, room._id, { customOrder: index }),
        ),
      )
      await loadInventory(selectedPgId, appliedFilters)
      toast.success('Room layout saved')
    } catch (error) {
      toast.error(parseApiError(error, 'Unable to save room layout'))
    } finally {
      setLayoutSavingFloorId('')
    }
  }

  const onDropRoomTile = async (floor: OwnerFloor, targetRoomId: string) => {
    if (!draggingRoomId || draggingRoomId === targetRoomId) {
      return
    }
    const floorRooms = roomsByFloor.get(floor._id) ?? []
    const sourceIndex = floorRooms.findIndex((room) => room._id === draggingRoomId)
    const targetIndex = floorRooms.findIndex((room) => room._id === targetRoomId)
    if (sourceIndex < 0 || targetIndex < 0) {
      return
    }

    const reordered = [...floorRooms]
    const [dragRoom] = reordered.splice(sourceIndex, 1)
    if (!dragRoom) {
      return
    }
    reordered.splice(targetIndex, 0, dragRoom)

    const reorderedIds = reordered.map((room) => room._id)
    setRooms((current) =>
      current.map((room) => {
        if (!reorderedIds.includes(room._id)) {
          return room
        }
        const nextOrder = reorderedIds.indexOf(room._id)
        return { ...room, customOrder: nextOrder }
      }),
    )

    await persistCustomRoomOrder(floor._id, reordered)
  }

  const hasPg = Boolean(selectedPgId)
  const hasFloors = floors.length > 0

  return (
    <>
      <div className="admin-hero-row inventory-hero-row">
        <div>
          <h2 className="page-heading inventory-page-heading">Rooms & Beds</h2>
          <p className="section-sub inventory-page-sub">
            Manage floor-wise rooms, bed-level availability, and tenant assignments for each property.
          </p>
        </div>
        {hasPg ? (
          <div className="inventory-top-actions">
            <button
              type="button"
              className="btn btn-line"
              onClick={() => {
                setSelectedPgId('')
                setDraftFilters(DEFAULT_FILTERS)
                setAppliedFilters(DEFAULT_FILTERS)
                setSelectedFloorId('')
              }}
            >
              <ArrowLeft size={15} />
              <span>All properties</span>
            </button>

            <FilterDrawer
              isOpen={isFilterDrawerOpen}
              onOpenChange={setIsFilterDrawerOpen}
              drawerId="owner-inventory-filters-drawer"
              title="Filter Rooms & Beds"
              disableApply={!hasPg}
              disableClear={!hasPg}
              onClear={onResetFilters}
              onApply={onApplyFilters}
            >
              <div className="form-field">
                <label>Floor</label>
                <select
                  value={draftFilters.floorId}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, floorId: event.target.value }))}
                  disabled={!hasPg}
                >
                  <option value="">All floors</option>
                  {floors.map((floor) => (
                    <option key={floor._id} value={floor._id}>{floor.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Bed status</label>
                <select
                  value={draftFilters.bedStatus}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, bedStatus: event.target.value as BedStatus | 'all' }))}
                  disabled={!hasPg}
                >
                  <option value="all">All</option>
                  <option value="vacant">Vacant</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div className="form-field">
                <label>Room type</label>
                <select
                  value={draftFilters.roomType}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, roomType: event.target.value as OwnerRoom['roomType'] | 'all' }))}
                  disabled={!hasPg}
                >
                  <option value="all">All</option>
                  {ROOM_TYPES.map((roomType) => (
                    <option key={roomType} value={roomType}>{roomType}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Search room number</label>
                <input
                  value={draftFilters.search}
                  placeholder="101, 202..."
                  onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))}
                  disabled={!hasPg}
                />
              </div>

              <label className="inventory-vacancy-toggle" htmlFor="inventory-vacancy-only">
                <input
                  id="inventory-vacancy-only"
                  type="checkbox"
                  checked={draftFilters.onlyWithAvailableBeds}
                  onChange={(event) =>
                    setDraftFilters((current) => ({ ...current, onlyWithAvailableBeds: event.target.checked }))
                  }
                  disabled={!hasPg}
                />
                <span>Only show rooms with vacant beds</span>
              </label>
            </FilterDrawer>
          </div>
        ) : null}
      </div>

      {!hasPg ? (
        <section className="spaced-top">
          <div className="inventory-section-head">
            <h3>Your Properties</h3>
          </div>

          {pgs.length === 0 ? (
            <div className="inventory-empty-state panel">
              <EmptyTableState />
              <h4>No properties found</h4>
              <p>Add your first PG listing to start floor planning and room allocation.</p>
            </div>
          ) : (
            <div className="property-grid">
              {pgs.map((pg) => (
                <article key={pg._id} className="panel property-card">
                  <div className="property-card-head">
                    <div>
                      <h4>{pg.name}</h4>
                      <p className="section-sub">{pg.address}</p>
                    </div>
                    {pg.photos?.[0] ? (
                      <img src={pg.photos[0]} alt={pg.name} className="property-card-photo" />
                    ) : null}
                  </div>

                  <p className="property-card-stats">
                    {pg.totalFloors ?? 0} Floors · {pg.totalRooms ?? 0} Rooms · {pg.totalBeds ?? 0} Beds
                  </p>
                  <p className="property-card-stats">
                    {pg.availableBeds ?? 0} Available · {pg.occupiedBeds ?? 0} Occupied
                  </p>

                  <button type="button" className="btn btn-brand" onClick={() => onSelectPg(pg._id)}>
                    Manage Floor Plan
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="inventory-stats-grid inventory-stats-grid-wide spaced-top">
            <article className="panel inventory-stat-card">
              <Layers3 size={16} />
              <div>
                <strong>{inventoryStats?.totalFloors ?? 0}</strong>
                <p>Total floors</p>
              </div>
            </article>
            <article className="panel inventory-stat-card">
              <Building2 size={16} />
              <div>
                <strong>{inventoryStats?.totalRooms ?? 0}</strong>
                <p>Total rooms</p>
              </div>
            </article>
            <article className="panel inventory-stat-card">
              <BedDouble size={16} />
              <div>
                <strong>{inventoryStats?.totalBeds ?? 0}</strong>
                <p>Total beds</p>
              </div>
            </article>
            <article className="panel inventory-stat-card">
              <CircleDashed size={16} />
              <div>
                <strong>{inventoryStats?.availableBeds ?? 0}</strong>
                <p>Vacant beds</p>
              </div>
            </article>
            <article className="panel inventory-stat-card">
              <UserCheck size={16} />
              <div>
                <strong>{inventoryStats?.occupiedBeds ?? 0}</strong>
                <p>Occupied beds</p>
              </div>
            </article>
            <article className="panel inventory-stat-card">
              <CheckCircle2 size={16} />
              <div>
                <strong>{inventoryStats?.reservedBeds ?? 0}</strong>
                <p>Reserved beds</p>
              </div>
            </article>
            <article className="panel inventory-stat-card">
              <Wrench size={16} />
              <div>
                <strong>{inventoryStats?.maintenanceBeds ?? 0}</strong>
                <p>Maintenance beds</p>
              </div>
            </article>
            <article className="panel inventory-stat-card">
              <Percent size={16} />
              <div>
                <strong>{inventoryStats?.occupancyPercentage ?? 0}%</strong>
                <p>Occupancy percentage</p>
              </div>
            </article>
          </section>

          <section className="panel">
            <div className="inventory-section-head inventory-section-head-right">
              <button type="button" className="btn btn-brand" onClick={onOpenAddFloor}>
                Add floor
              </button>
            </div>

            <div className="floor-plan-legend">
              <span><i className="legend-dot available" /> All beds available</span>
              <span><i className="legend-dot partial" /> Partially occupied</span>
              <span><i className="legend-dot occupied" /> Fully occupied</span>
              <span><i className="legend-dot reserved" /> Reserved</span>
              <span><i className="legend-dot maintenance" /> Maintenance</span>
            </div>

            {isInventoryLoading ? (
              <div className="inventory-loading">
                <LoaderCircle size={16} className="spin" />
                <span>Loading floor map...</span>
              </div>
            ) : inventoryError ? (
              <div className="inventory-error">
                <CircleAlert size={16} />
                <span>{inventoryError}</span>
              </div>
            ) : !hasFloors ? (
              <div className="inventory-empty-state">
                <EmptyTableState />
                <h4>No floors configured yet</h4>
                <p>Add your first floor to begin visual room planning.</p>
                <button type="button" className="btn btn-line" onClick={onOpenAddFloor}>
                  Add first floor
                </button>
              </div>
            ) : (
              <div className="floor-plan-map">
                {visualFloors.map((floor) => {
                  const floorRooms = roomsByFloor.get(floor._id) ?? []
                  const summary = floorSummaries.get(floor._id) ?? {
                    rooms: 0,
                    totalBeds: 0,
                    occupied: 0,
                    vacant: 0,
                    reserved: 0,
                    maintenance: 0,
                  }
                  const isFocused = selectedFloorId === floor._id
                  const layoutMode = floor.layoutMode ?? 'grid'
                  const gridColumns = Math.min(Math.max(floor.gridColumns ?? 6, 2), 12)

                  return (
                    <article key={floor._id} className={`floor-plan-row ${isFocused ? 'focused' : ''}`}>
                      <button type="button" className="floor-plan-label" onClick={() => onSelectFloorFromCard(floor._id)}>
                        <strong>{floor.name}</strong>
                        <span>{summary.rooms} rooms</span>
                      </button>

                      <div className="floor-plan-content">
                        <div className="floor-plan-row-head">
                          <div className="floor-plan-meta">
                            <h4>Occupancy</h4>
                            <p className="section-sub">
                              {summary.totalBeds} beds · {summary.vacant} available · {summary.occupied} occupied
                            </p>
                          </div>
                          <div className="table-action-row">
                            <button
                              type="button"
                              className={`btn btn-line ${layoutMode === 'grid' ? 'active' : ''}`}
                              onClick={() => onSwitchFloorLayoutMode(floor, 'grid')}
                              disabled={layoutSavingFloorId === floor._id}
                            >
                              <LayoutGrid size={14} />
                              <span>Grid</span>
                            </button>
                            <button
                              type="button"
                              className={`btn btn-line ${layoutMode === 'custom' ? 'active' : ''}`}
                              onClick={() => onSwitchFloorLayoutMode(floor, 'custom')}
                              disabled={layoutSavingFloorId === floor._id}
                            >
                              <LayoutTemplate size={14} />
                              <span>Custom</span>
                            </button>
                            <button type="button" className="btn btn-line" onClick={() => openCreateRoomDialog(floor._id)}>
                              Add room
                            </button>
                            <button type="button" className="btn btn-line" onClick={() => onOpenEditFloor(floor)}>
                              Edit
                            </button>
                            <button type="button" className="btn btn-line" onClick={() => setFloorDeleteTarget(floor)}>
                              Delete
                            </button>
                          </div>
                        </div>

                        {floorRooms.length === 0 ? (
                          <div className="inventory-room-bed-empty">
                            <p>No rooms in this floor yet.</p>
                          </div>
                        ) : (
                          <div
                            className={`room-tile-grid ${layoutMode}`}
                            style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(84px, 1fr))` }}
                          >
                            {floorRooms.map((room) => {
                              const roomState = getRoomVisualState(room)
                              return (
                                <button
                                  key={room._id}
                                  type="button"
                                  draggable={layoutMode === 'custom'}
                                  onDragStart={() => setDraggingRoomId(room._id)}
                                  onDragEnd={() => setDraggingRoomId('')}
                                  onDragOver={(event) => {
                                    if (layoutMode === 'custom') {
                                      event.preventDefault()
                                    }
                                  }}
                                  onDrop={async (event) => {
                                    if (layoutMode === 'custom') {
                                      event.preventDefault()
                                      await onDropRoomTile(floor, room._id)
                                    }
                                  }}
                                  className={`${roomVisualStateClass(roomState)} ${draggingRoomId === room._id ? 'dragging' : ''}`}
                                  onClick={() => setRoomDetailDialog(room)}
                                  title={`Room ${room.roomNumber} • ${room.occupancy.vacant}/${room.occupancy.total} beds available`}
                                >
                                  <span className="room-tile-number">{room.roomNumber}</span>
                                  <small>{room.occupancy.vacant}/{room.occupancy.total} free</small>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}

      {isFloorModalOpen ? (
        <div className="app-dialog-backdrop">
          <div className="app-dialog inventory-dialog-narrow">
            <div className="app-dialog-head">
              <div>
                <h3>{editingFloor ? 'Edit floor' : 'Add floor'}</h3>
                <p>Provide a unique floor name for this property.</p>
              </div>
              <button type="button" className="dialog-close-btn" onClick={() => setIsFloorModalOpen(false)}>
                x
              </button>
            </div>

            <div className="form-field">
              <label>{renderConfiguredLabel(floorConfig, 'name', 'Floor name')}</label>
              <input
                value={floorNameInput}
                onChange={(event) => setFloorNameInput(event.target.value)}
                placeholder="Ground Floor, First Floor, ..."
              />
            </div>

            <div className="form-field">
              <label>{renderConfiguredLabel(floorConfig, 'level', 'Display order (level)')}</label>
              <input
                type="number"
                min={0}
                value={floorLevelInput}
                onChange={(event) => setFloorLevelInput(event.target.value)}
                placeholder="0 for Ground, 1 for First..."
              />
            </div>

            <div className="pg-form-actions">
              <button type="button" className="btn btn-line" onClick={() => setIsFloorModalOpen(false)} disabled={isSavingFloor}>
                Cancel
              </button>
              <button type="button" className="btn btn-brand" onClick={onSaveFloor} disabled={isSavingFloor}>
                {isSavingFloor ? 'Saving...' : editingFloor ? 'Save floor' : 'Add floor'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {floorDeleteTarget ? (
        <div className="app-dialog-backdrop">
          <div className="app-dialog inventory-dialog-narrow">
            <div className="app-dialog-head">
              <div>
                <h3>Delete floor</h3>
                <p>
                  Delete {floorDeleteTarget.name}? This works only when the floor has no rooms.
                </p>
              </div>
              <button type="button" className="dialog-close-btn" onClick={() => setFloorDeleteTarget(null)}>
                x
              </button>
            </div>

            <div className="pg-form-actions">
              <button type="button" className="btn btn-line" onClick={() => setFloorDeleteTarget(null)} disabled={isDeletingFloor}>
                Cancel
              </button>
              <button type="button" className="btn btn-brand" onClick={onDeleteFloor} disabled={isDeletingFloor}>
                {isDeletingFloor ? 'Deleting...' : 'Delete floor'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {roomDialogOpen ? (
        <div className="app-dialog-backdrop">
          <div className="app-dialog">
            <div className="app-dialog-head">
              <div>
                <h3>{editingRoom ? 'Edit room' : 'Add room'}</h3>
                <p>Configure room details and bed capacity.</p>
              </div>
              <button type="button" className="dialog-close-btn" onClick={() => setRoomDialogOpen(false)}>
                x
              </button>
            </div>

            <div className="form-grid two-col">
              <div className="form-field">
                <label>{renderConfiguredLabel(roomConfig, 'floorId', 'Floor')}</label>
                <select
                  value={roomForm.floorId}
                  onChange={(event) => setRoomForm((current) => ({ ...current, floorId: event.target.value }))}
                >
                  <option value="">Select floor</option>
                  {floors.map((floor) => (
                    <option key={floor._id} value={floor._id}>{floor.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>{renderConfiguredLabel(roomConfig, 'roomNumber', 'Room number')}</label>
                <input
                  value={roomForm.roomNumber}
                  onChange={(event) => setRoomForm((current) => ({ ...current, roomNumber: event.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>{renderConfiguredLabel(roomConfig, 'roomType', 'Room type')}</label>
                <select
                  value={roomForm.roomType}
                  onChange={(event) =>
                    setRoomForm((current) => ({ ...current, roomType: event.target.value as OwnerRoom['roomType'] }))
                  }
                >
                  {ROOM_TYPES.map((roomType) => (
                    <option key={roomType} value={roomType}>{roomType}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>{renderConfiguredLabel(roomConfig, 'totalBedCapacity', 'Total bed capacity')}</label>
                <input
                  type="number"
                  min={1}
                  value={roomForm.totalBedCapacity}
                  onChange={(event) =>
                    setRoomForm((current) => ({ ...current, totalBedCapacity: Math.max(Number(event.target.value) || 1, 1) }))
                  }
                />
              </div>
              <div className="form-field">
                <label>{renderConfiguredLabel(roomConfig, 'monthlyRent', 'Monthly rent (per bed)')}</label>
                <input
                  type="number"
                  min={0}
                  value={roomForm.monthlyRent}
                  onChange={(event) =>
                    setRoomForm((current) => ({ ...current, monthlyRent: Math.max(Number(event.target.value) || 0, 0) }))
                  }
                />
              </div>
              <div className="form-field">
                <label>{renderConfiguredLabel(roomConfig, 'bathroomType', 'Bathroom type')}</label>
                <select
                  value={roomForm.bathroomType}
                  onChange={(event) =>
                    setRoomForm((current) => ({ ...current, bathroomType: event.target.value as 'attached' | 'common' }))
                  }
                >
                  <option value="attached">Attached bathroom</option>
                  <option value="common">Common bathroom</option>
                </select>
              </div>
              <div className="form-field">
                <label>{renderConfiguredLabel(roomConfig, 'acType', 'AC type')}</label>
                <select
                  value={roomForm.acType}
                  onChange={(event) =>
                    setRoomForm((current) => ({ ...current, acType: event.target.value as 'ac' | 'non-ac' }))
                  }
                >
                  <option value="ac">AC</option>
                  <option value="non-ac">Non-AC</option>
                </select>
              </div>
              <div className="form-field">
                <label>{renderConfiguredLabel(roomConfig, 'status', 'Room status')}</label>
                <select
                  value={roomForm.status}
                  onChange={(event) =>
                    setRoomForm((current) => ({ ...current, status: event.target.value as RoomStatus }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>{renderConfiguredLabel(roomConfig, 'description', 'Description')}</label>
              <textarea
                rows={3}
                value={roomForm.description}
                onChange={(event) => setRoomForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>

            <div className="pg-form-actions">
              <button type="button" className="btn btn-line" onClick={() => setRoomDialogOpen(false)} disabled={isSavingRoom}>
                Cancel
              </button>
              <button type="button" className="btn btn-brand" onClick={onSaveRoom} disabled={isSavingRoom}>
                {isSavingRoom ? 'Saving...' : editingRoom ? 'Save changes' : 'Create room'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {roomDeleteTarget ? (
        <div className="app-dialog-backdrop">
          <div className="app-dialog inventory-dialog-narrow">
            <div className="app-dialog-head">
              <div>
                <h3>Delete room</h3>
                <p>
                  Delete room {roomDeleteTarget.roomNumber}? Rooms with active or historical assignments cannot be deleted.
                </p>
              </div>
              <button type="button" className="dialog-close-btn" onClick={() => setRoomDeleteTarget(null)}>
                x
              </button>
            </div>

            <div className="pg-form-actions">
              <button type="button" className="btn btn-line" onClick={() => setRoomDeleteTarget(null)} disabled={isDeletingRoom}>
                Cancel
              </button>
              <button type="button" className="btn btn-brand" onClick={onDeleteRoom} disabled={isDeletingRoom}>
                {isDeletingRoom ? 'Deleting...' : 'Delete room'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {roomDetailDialog ? (
        <div className="app-dialog-backdrop">
          <div className="app-dialog app-dialog-wide">
            <div className="app-dialog-head">
              <div>
                <h3>Room {roomDetailDialog.roomNumber} - {roomDetailDialog.roomType}</h3>
                <p>
                  Total Beds: {roomDetailDialog.occupancy.total} · Available: {roomDetailDialog.occupancy.vacant} · Occupied: {roomDetailDialog.occupancy.occupied} · Reserved: {roomDetailDialog.occupancy.reserved}
                </p>
              </div>
              <button type="button" className="dialog-close-btn" onClick={() => setRoomDetailDialog(null)}>
                x
              </button>
            </div>

            <div className="room-detail-meta">
              <StatusBadge value={roomDetailDialog.status ?? 'active'} />
              <span>Rent: {toCurrency(roomDetailDialog.monthlyRent ?? 0)} / bed</span>
              <span>Bathroom: {roomDetailDialog.bathroomType === 'attached' ? 'Attached' : 'Common'}</span>
              <span>{roomDetailDialog.acType === 'ac' ? 'AC' : 'Non-AC'}</span>
            </div>

            <div className="table-action-row spaced-top">
              <button
                type="button"
                className="btn btn-line"
                onClick={() => {
                  openEditRoomDialog(roomDetailDialog)
                  setRoomDetailDialog(null)
                }}
              >
                Manage room
              </button>
              <button
                type="button"
                className="btn btn-line"
                onClick={() => {
                  setRoomDeleteTarget(roomDetailDialog)
                  setRoomDetailDialog(null)
                }}
              >
                Delete room
              </button>
            </div>

            <div className="inventory-bed-grid spaced-top">
              {roomDetailDialog.beds.length > 0 ? (
                roomDetailDialog.beds.map((bed) => (
                  <button
                    key={bed._id}
                    type="button"
                    className={bedTileClass(bed.status)}
                    onClick={() => openBedDialog(roomDetailDialog, bed)}
                  >
                    <span>{bed.bedLabel}</span>
                    <small>{BED_STATUS_LABEL[bed.status]}</small>
                  </button>
                ))
              ) : (
                <div className="inventory-room-bed-empty">
                  <p>No beds configured for this room.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {bedDialog ? (
        <div className="app-dialog-backdrop">
          <div className="app-dialog app-dialog-wide inventory-bed-dialog">
            <div className="app-dialog-head">
              <div>
                <h3>Room {bedDialog.room.roomNumber} · {bedDialog.bed.bedLabel}</h3>
                <p>
                  {BED_STATUS_LABEL[bedDialog.bed.status]} · Monthly rent {toCurrency(bedDialog.bed.monthlyRent ?? bedDialog.room.monthlyRent ?? 0)}
                </p>
              </div>
              <button type="button" className="dialog-close-btn" onClick={() => setBedDialog(null)}>
                x
              </button>
            </div>

            <div className="form-grid two-col inventory-bed-dialog-grid">
              <div className="panel inventory-bed-status-panel">
                <h4>Bed details and status</h4>
                <p className="section-sub spaced-top">Bed number: {bedDialog.bed.bedLabel}</p>
                <p className="section-sub">Current availability: {BED_STATUS_LABEL[bedDialog.bed.status]}</p>
                <p className="section-sub">Expected vacating date: {formatDateInput(bedDialog.bed.expectedVacatingDate) || '-'}</p>

                {currentBedResident ? null : (
                  <div className="table-action-row spaced-top">
                    <button
                      type="button"
                      className="btn btn-line"
                      disabled={isUpdatingBed || bedDialog.bed.status === 'vacant'}
                      onClick={() => onUpdateBedStatus('vacant')}
                    >
                      Mark as available
                    </button>
                    <button
                      type="button"
                      className="btn btn-line"
                      disabled={isUpdatingBed || bedDialog.bed.status === 'reserved'}
                      onClick={() => onUpdateBedStatus('reserved')}
                    >
                      Mark as reserved
                    </button>
                    <button
                      type="button"
                      className="btn btn-line"
                      disabled={isUpdatingBed || bedDialog.bed.status === 'maintenance'}
                      onClick={() => onUpdateBedStatus('maintenance')}
                    >
                      Mark maintenance
                    </button>
                  </div>
                )}

                {!currentBedResident ? (
                  <>
                    <div className="form-field inventory-maintenance-field">
                      <label>Maintenance reason</label>
                      <textarea
                        rows={2}
                        value={maintenanceReason}
                        onChange={(event) => setMaintenanceReason(event.target.value)}
                      />
                    </div>
                  </>
                ) : null}
              </div>

              <div className="panel inventory-bed-assign-panel">
                <h4>{currentBedResident ? 'Tenant information' : 'Assign tenant'}</h4>
                {currentBedResident ? (
                  <>
                    <p><strong>{currentBedResident.fullName}</strong> ({currentBedResident.phone})</p>
                    <p className="section-sub">Joining date: {new Date(currentBedResident.joiningDate).toLocaleDateString()}</p>
                    <p className="section-sub">Current rent: {toCurrency(currentBedResident.rent ?? 0)}</p>

                    <div className="form-grid two-col spaced-top">
                      <div className="form-field">
                        <label>{renderConfiguredLabel(bedVacateConfig, 'leavingDate', 'Leaving date')}</label>
                        <input
                          type="date"
                          value={vacateForm.leavingDate}
                          onChange={(event) =>
                            setVacateForm((current) => ({ ...current, leavingDate: event.target.value }))
                          }
                        />
                      </div>
                      <div className="form-field">
                        <label>{renderConfiguredLabel(bedVacateConfig, 'finalSettlementAmount', 'Final settlement amount')}</label>
                        <input
                          type="number"
                          min={0}
                          value={vacateForm.finalSettlementAmount}
                          onChange={(event) =>
                            setVacateForm((current) => ({ ...current, finalSettlementAmount: Math.max(Number(event.target.value) || 0, 0) }))
                          }
                        />
                      </div>
                    </div>

                    <div className="form-field">
                      <label>{renderConfiguredLabel(bedVacateConfig, 'reason', 'Reason')}</label>
                      <input
                        value={vacateForm.reason}
                        onChange={(event) => setVacateForm((current) => ({ ...current, reason: event.target.value }))}
                      />
                    </div>
                    <div className="form-field">
                      <label>{renderConfiguredLabel(bedVacateConfig, 'notes', 'Notes')}</label>
                      <textarea
                        rows={2}
                        value={vacateForm.notes}
                        onChange={(event) => setVacateForm((current) => ({ ...current, notes: event.target.value }))}
                      />
                    </div>
                    <div className="form-field">
                      <label>
                        {bedVacateConfig.isRequired('finalSettlementPaid') ? <span className="required-mark">* </span> : null}
                        <input
                          type="checkbox"
                          checked={vacateForm.finalSettlementPaid}
                          onChange={(event) =>
                            setVacateForm((current) => ({ ...current, finalSettlementPaid: event.target.checked }))
                          }
                        />
                        Settlement paid
                      </label>
                    </div>

                    <button type="button" className="btn btn-brand" disabled={isUpdatingBed} onClick={onVacateBed}>
                      Initiate vacating process
                    </button>
                  </>
                ) : (
                  <>
                    <div className="form-field">
                      <label>{renderConfiguredLabel(residentAddConfig, 'fullName', 'Tenant from People')}</label>
                      <select
                        value={selectedResidentIdForBed}
                        onChange={(event) => setSelectedResidentIdForBed(event.target.value)}
                      >
                        <option value="">Select tenant</option>
                        {movableResidents.map((resident) => (
                          <option key={resident._id} value={resident._id}>
                            {resident.fullName} · {resident.phone}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedResidentForBed ? (
                      <div className="inventory-selected-tenant-meta">
                        <p className="section-sub">Phone: {selectedResidentForBed.phone}</p>
                        <p className="section-sub">Rent: {toCurrency(selectedResidentForBed.rent ?? 0)}</p>
                        <p className="section-sub">Joining date: {new Date(selectedResidentForBed.joiningDate).toLocaleDateString()}</p>
                        <p className="section-sub">Status: {selectedResidentForBed.status.replaceAll('_', ' ')}</p>
                      </div>
                    ) : null}

                    <button type="button" className="btn btn-brand spaced-top" disabled={isUpdatingBed} onClick={onAssignTenant}>
                      Assign tenant
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {(isResidentsLoading && selectedPgId) ? (
        <p className="section-sub spaced-top">Updating resident status cache...</p>
      ) : null}
    </>
  )
}
