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
]

export function getDefaultFormConfig(formKey: string) {
  return FORM_CONFIG_DEFAULTS.find((item) => item.formKey === formKey) ?? null
}
