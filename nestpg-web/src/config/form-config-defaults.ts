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
    formKey: 'auth.login',
    title: 'Public Login Form',
    fields: [
      { key: 'email', label: 'Email address', required: true },
      { key: 'password', label: 'Password', required: true },
    ],
  },
  {
    formKey: 'auth.register',
    title: 'Public Registration Form',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'phone', label: 'Phone', required: true },
      { key: 'email', label: 'Email', required: true },
      { key: 'password', label: 'Password', required: true },
      { key: 'confirmPassword', label: 'Confirm password', required: true },
    ],
  },
  {
    formKey: 'auth.tenantRegistration',
    title: 'Public Tenant Registration Details',
    fields: [
      { key: 'pgId', label: 'Select PG name', required: true },
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
  {
    formKey: 'tenant.complaint',
    title: 'Tenant Complaint Form',
    fields: [
      { key: 'title', label: 'Title', required: true },
      { key: 'description', label: 'Description', required: true },
    ],
  },
  {
    formKey: 'tenant.paymentProof',
    title: 'Tenant Payment Proof Form',
    fields: [
      { key: 'amount', label: 'Amount', required: true },
      { key: 'paidForMonth', label: 'Paid month', required: false },
      { key: 'transactionRef', label: 'Transaction ref', required: false },
      { key: 'screenshotUpload', label: 'Screenshot upload', required: true },
      { key: 'notes', label: 'Notes', required: false },
    ],
  },
  {
    formKey: 'tenant.absence',
    title: 'Tenant Absence Form',
    fields: [
      { key: 'fromDate', label: 'From date', required: true },
      { key: 'toDate', label: 'To date', required: true },
      { key: 'reason', label: 'Reason', required: true },
    ],
  },
  {
    formKey: 'tenant.profileUpdateRequest',
    title: 'Tenant Profile Update Request Form',
    fields: [
      { key: 'name', label: 'Full Name', required: false },
      { key: 'phone', label: 'Phone Number', required: false },
      { key: 'email', label: 'Email Address', required: false },
      { key: 'profileAddress', label: 'Current Address', required: false },
      { key: 'emergencyContactName', label: 'Emergency Contact Name', required: false },
      { key: 'emergencyContactPhone', label: 'Emergency Contact Phone', required: false },
      { key: 'notes', label: 'Reason / Additional Notes', required: false },
    ],
  },
  {
    formKey: 'owner.staff.employee',
    title: 'Owner Staff Employee Form',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'phone', label: 'Phone', required: true },
      { key: 'email', label: 'Email', required: false },
      { key: 'roleId', label: 'Role', required: true },
      { key: 'monthlySalary', label: 'Monthly salary', required: true },
      { key: 'joiningDate', label: 'Joining date', required: true },
      { key: 'address', label: 'Address', required: false },
      { key: 'notes', label: 'Notes', required: false },
    ],
  },
  {
    formKey: 'owner.staff.role',
    title: 'Owner Staff Role Form',
    fields: [
      { key: 'name', label: 'Role name', required: true },
      { key: 'color', label: 'Role color', required: true },
    ],
  },
  {
    formKey: 'owner.staff.attendance',
    title: 'Owner Staff Attendance Form',
    fields: [
      { key: 'date', label: 'Attendance date', required: true },
      { key: 'status', label: 'Status', required: true },
      { key: 'checkIn', label: 'Check in', required: false },
      { key: 'checkOut', label: 'Check out', required: false },
    ],
  },
  {
    formKey: 'owner.staff.expense',
    title: 'Owner Staff Expense Form',
    fields: [
      { key: 'employeeId', label: 'Employee', required: true },
      { key: 'amount', label: 'Amount', required: true },
      { key: 'description', label: 'Description', required: true },
      { key: 'category', label: 'Category', required: true },
      { key: 'expenseDate', label: 'Expense date', required: true },
    ],
  },
  {
    formKey: 'owner.staff.leave',
    title: 'Owner Staff Leave Form',
    fields: [
      { key: 'employeeId', label: 'Employee', required: true },
      { key: 'startDate', label: 'Start date', required: true },
      { key: 'endDate', label: 'End date', required: true },
      { key: 'leaveType', label: 'Leave type', required: true },
      { key: 'reason', label: 'Reason', required: false },
    ],
  },
  {
    formKey: 'owner.staff.salary',
    title: 'Owner Staff Salary Form',
    fields: [
      { key: 'employeeId', label: 'Employee', required: true },
      { key: 'month', label: 'Month', required: true },
      { key: 'year', label: 'Year', required: true },
      { key: 'deductions', label: 'Deductions', required: false },
      { key: 'bonuses', label: 'Bonuses', required: false },
      { key: 'paidAt', label: 'Paid at', required: true },
      { key: 'paymentMode', label: 'Payment mode', required: true },
    ],
  },
]

export function getDefaultFormConfig(formKey: string) {
  return FORM_CONFIG_DEFAULTS.find((item) => item.formKey === formKey) ?? null
}
