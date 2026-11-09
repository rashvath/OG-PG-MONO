export type FormFieldConfig = {
  key: string
  label: string
  required: boolean
}

export type FormConfig = {
  formKey: string
  title: string
  fields: FormFieldConfig[]
}

export const FORM_CONFIG_DEFAULTS: FormConfig[] = [
  {
    formKey: 'auth.register',
    title: 'Public Registration Form',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'phone', label: 'Phone', required: true },
      { key: 'email', label: 'Email', required: true },
      { key: 'password', label: 'Password', required: true },
    ],
  },
  {
    formKey: 'auth.ownerRegistration',
    title: 'Public Owner Registration Details',
    fields: [
      { key: 'pgName', label: 'PG Name', required: true },
      { key: 'area', label: 'Area', required: true },
      { key: 'pgAddress', label: 'PG Address', required: true },
      { key: 'rooms', label: 'Rooms', required: true },
      { key: 'rent', label: 'Monthly rent', required: true },
      { key: 'amenities', label: 'Amenities (comma separated)', required: false },
      { key: 'photos', label: 'Photo URLs (comma separated)', required: false },
      { key: 'description', label: 'Description', required: false },
    ],
  },
  {
    formKey: 'admin.pgs',
    title: 'Admin PG Form',
    fields: [
      { key: 'name', label: 'PG name', required: true },
      { key: 'area', label: 'Area', required: false },
      { key: 'address', label: 'Address', required: false },
      { key: 'baseRent', label: 'Starting rent', required: true },
      { key: 'gender', label: 'Gender', required: true },
      { key: 'contactName', label: 'Contact person name', required: true },
      { key: 'contactPhone', label: 'Contact phone', required: false },
      { key: 'mapsLocation', label: 'Location from map', required: true },
      { key: 'weeklyMenu', label: '7-day menu', required: false },
    ],
  },
  {
    formKey: 'owner.pgs',
    title: 'Owner PG Form',
    fields: [
      { key: 'name', label: 'PG name', required: true },
      { key: 'area', label: 'Area', required: true },
      { key: 'address', label: 'Address', required: true },
      { key: 'baseRent', label: 'Starting rent', required: true },
      { key: 'gender', label: 'Gender', required: true },
      { key: 'contactName', label: 'Contact person name', required: true },
      { key: 'contactPhone', label: 'Contact phone', required: true },
      { key: 'mapsLocation', label: 'Location from map', required: true },
      { key: 'weeklyMenu', label: '7-day menu', required: true },
    ],
  },
  {
    formKey: 'admin.ownerCreate',
    title: 'Admin Create Owner Form',
    fields: [
      { key: 'name', label: 'Owner name', required: true },
      { key: 'email', label: 'Email', required: true },
      { key: 'phone', label: 'Phone', required: true },
      { key: 'temporaryPassword', label: 'Temporary password', required: true },
    ],
  },
  {
    formKey: 'owner.documents',
    title: 'Owner Document Form',
    fields: [
      { key: 'pgId', label: 'PG', required: true },
      { key: 'title', label: 'Document name', required: true },
      { key: 'imageUrl', label: 'Document image', required: true },
    ],
  },
  {
    formKey: 'owner.residentAdd',
    title: 'Owner Add Resident Form',
    fields: [
      { key: 'pgId', label: 'PG', required: true },
      { key: 'fullName', label: 'Resident name', required: true },
      { key: 'phone', label: 'Phone', required: true },
      { key: 'joiningDate', label: 'Joining date', required: false },
      { key: 'rent', label: 'Monthly rent', required: true },
      { key: 'deposit', label: 'Deposit', required: false },
      { key: 'amountPaid', label: 'Amount paid by resident', required: false },
      { key: 'profilePhoto', label: 'Resident image', required: false },
    ],
  },
  {
    formKey: 'owner.residentEdit',
    title: 'Owner Edit Resident Form',
    fields: [
      { key: 'fullName', label: 'Resident name', required: true },
      { key: 'phone', label: 'Phone', required: true },
      { key: 'joiningDate', label: 'Joining date', required: false },
      { key: 'rent', label: 'Monthly rent', required: true },
      { key: 'deposit', label: 'Deposit', required: false },
      { key: 'amountPaid', label: 'Amount paid by resident', required: false },
    ],
  },
  {
    formKey: 'owner.residentLeft',
    title: 'Owner Resident Exit Form',
    fields: [
      { key: 'leavingDate', label: 'Leaving date', required: true },
      { key: 'finalSettlementAmount', label: 'Closing amount owner is paying', required: true },
      { key: 'finalSettlementPaid', label: 'Payment settled', required: false },
      { key: 'reason', label: 'Reason', required: false },
      { key: 'notes', label: 'Notes', required: false },
    ],
  },
  {
    formKey: 'owner.floor',
    title: 'Owner Floor Form',
    fields: [
      { key: 'name', label: 'Floor name', required: true },
      { key: 'level', label: 'Display order (level)', required: false },
    ],
  },
  {
    formKey: 'owner.room',
    title: 'Owner Room Form',
    fields: [
      { key: 'floorId', label: 'Floor', required: true },
      { key: 'roomNumber', label: 'Room number', required: true },
      { key: 'roomType', label: 'Room type', required: true },
      { key: 'totalBedCapacity', label: 'Total bed capacity', required: true },
      { key: 'monthlyRent', label: 'Monthly rent (per bed)', required: true },
      { key: 'bathroomType', label: 'Bathroom type', required: false },
      { key: 'acType', label: 'AC type', required: false },
      { key: 'status', label: 'Room status', required: false },
      { key: 'description', label: 'Description', required: false },
    ],
  },
  {
    formKey: 'owner.bedReservation',
    title: 'Owner Bed Reservation Form',
    fields: [
      { key: 'reservedForName', label: 'Reservation name', required: true },
      { key: 'reservedForPhone', label: 'Reservation phone', required: false },
      { key: 'expectedMoveInDate', label: 'Expected move-in date', required: false },
      { key: 'expectedVacatingDate', label: 'Expected vacating date', required: false },
      { key: 'maintenanceReason', label: 'Maintenance reason', required: false },
    ],
  },
  {
    formKey: 'owner.bedAssign',
    title: 'Owner Bed Assign Tenant Form',
    fields: [
      { key: 'fullName', label: 'Name', required: true },
      { key: 'phone', label: 'Phone', required: true },
      { key: 'email', label: 'Email', required: false },
      { key: 'joiningDate', label: 'Joining date', required: false },
      { key: 'expectedExitDate', label: 'Expected vacating date', required: false },
      { key: 'rent', label: 'Monthly rent', required: true },
      { key: 'deposit', label: 'Security deposit', required: false },
      { key: 'amountPaid', label: 'Amount paid', required: false },
    ],
  },
  {
    formKey: 'owner.bedVacate',
    title: 'Owner Bed Vacate Form',
    fields: [
      { key: 'leavingDate', label: 'Leaving date', required: true },
      { key: 'finalSettlementAmount', label: 'Final settlement amount', required: true },
      { key: 'reason', label: 'Reason', required: false },
      { key: 'notes', label: 'Notes', required: false },
      { key: 'finalSettlementPaid', label: 'Settlement paid', required: false },
    ],
  },
]

export function getDefaultFormConfig(formKey: string) {
  return FORM_CONFIG_DEFAULTS.find((item) => item.formKey === formKey) ?? null
}
