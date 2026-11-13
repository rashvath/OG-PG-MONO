import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { ModuleHelpButton } from '@/components/layout/ModuleHelpButton'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { RouteSpinner } from '@/components/ui/RouteSpinner'
import { AppToaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/lib/auth'
import { StoreProvider } from '@/lib/store'
import { ThemeProvider } from '@/lib/theme'
import { AboutPage } from '@/pages/AboutPage'
import { HomePage } from '@/pages/HomePage'

const ListingsPage = lazy(() => import('@/pages/ListingsPage').then((m) => ({ default: m.ListingsPage })))
const PgDetailPage = lazy(() => import('@/pages/PgDetailPage').then((m) => ({ default: m.PgDetailPage })))
const LoginPage = lazy(() => import('@/pages/AuthPages').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/AuthPages').then((m) => ({ default: m.RegisterPage })))
const TenantOverviewPage = lazy(() => import('./pages/tenant/TenantOverviewPage').then((m) => ({ default: m.TenantOverviewPage })))
const TenantComplaintsPage = lazy(() => import('./pages/tenant/TenantComplaintsPage').then((m) => ({ default: m.TenantComplaintsPage })))
const TenantPaymentsPage = lazy(() => import('./pages/tenant/TenantPaymentsPage').then((m) => ({ default: m.TenantPaymentsPage })))
const TenantAbsencesPage = lazy(() => import('./pages/tenant/TenantAbsencesPage').then((m) => ({ default: m.TenantAbsencesPage })))
const TenantProfileRequestsPage = lazy(() =>
  import('@/pages/tenant/TenantProfileRequestsPage').then((m) => ({ default: m.TenantProfileRequestsPage })),
)
const TenantReviewApprovalsPage = lazy(() =>
  import('./pages/tenant-review/TenantReviewApprovalsPage').then((m) => ({ default: m.TenantReviewApprovalsPage })),
)
const TenantReviewComplaintsPage = lazy(() =>
  import('./pages/tenant-review/TenantReviewComplaintsPage').then((m) => ({ default: m.TenantReviewComplaintsPage })),
)
const TenantReviewPaymentsPage = lazy(() =>
  import('./pages/tenant-review/TenantReviewPaymentsPage').then((m) => ({ default: m.TenantReviewPaymentsPage })),
)
const TenantReviewAbsencesPage = lazy(() =>
  import('./pages/tenant-review/TenantReviewAbsencesPage').then((m) => ({ default: m.TenantReviewAbsencesPage })),
)
const TenantReviewProfilesPage = lazy(() =>
  import('@/pages/tenant-review/TenantReviewProfilesPage').then((m) => ({ default: m.TenantReviewProfilesPage })),
)

const OwnerOverviewPage = lazy(() => import('@/pages/OwnerPages').then((m) => ({ default: m.OwnerOverviewPage })))
const OwnerAddPgPage = lazy(() => import('@/pages/OwnerPages').then((m) => ({ default: m.OwnerAddPgPage })))
const OwnerEnquiriesPage = lazy(() => import('@/pages/OwnerPages').then((m) => ({ default: m.OwnerEnquiriesPage })))
const OwnerResidentsPage = lazy(() => import('@/pages/OwnerPages').then((m) => ({ default: m.OwnerResidentsPage })))
const OwnerInventoryPage = lazy(() => import('@/pages/OwnerInventoryPage').then((m) => ({ default: m.OwnerInventoryPage })))
const OwnerBalanceSheetPage = lazy(() =>
  import('@/pages/BalanceSheetPages').then((m) => ({ default: m.OwnerBalanceSheetPage })),
)
const AdminBalanceSheetPage = lazy(() =>
  import('@/pages/BalanceSheetPages').then((m) => ({ default: m.AdminBalanceSheetPage })),
)
const OwnerDocumentsPage = lazy(() => import('@/pages/OwnerDocumentsPage').then((m) => ({ default: m.OwnerDocumentsPage })))
const OwnerStaffPage = lazy(() => import('@/pages/OwnerStaffPage').then((m) => ({ default: m.OwnerStaffPage })))

const AdminOverviewPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminOverviewPage })))
const AdminPgsPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminPgsPage })))
const AdminOwnersPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminOwnersPage })))
const AdminOwnerApprovalsPage = lazy(() =>
  import('@/pages/AdminPages').then((m) => ({ default: m.AdminOwnerApprovalsPage })),
)
const AdminEnquiriesPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminEnquiriesPage })))
const AdminResidentsPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminResidentsPage })))
const AdminUsersPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminUsersPage })))
const AdminFormConfigPage = lazy(() => import('@/pages/FormConfigPage').then((m) => ({ default: m.AdminFormConfigPage })))

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StoreProvider>
          <BrowserRouter>
            <Header />
            <main>
              <Suspense fallback={<RouteSpinner label="Loading page..." />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/listings" element={<ListingsPage />} />
                  <Route path="/pg/:id" element={<PgDetailPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />

                  <Route element={<ProtectedRoute allow="owner" />}>
                    <Route
                      path="/owner"
                      element={
                        <DashboardLayout
                          title="Owner"
                          links={[
                            { label: 'Overview', to: '/owner' },
                            { label: 'PGs', to: '/owner/add' },
                            { label: 'People', to: '/owner/residents' },
                            { label: 'Rooms & Beds', to: '/owner/inventory' },
                            { label: 'Enquiries', to: '/owner/enquiries' },
                            { label: 'Balance Sheet', to: '/owner/balance-sheet' },
                            { label: 'Documents', to: '/owner/documents' },
                            { label: 'Staff', to: '/owner/staff' },
                            { label: 'Tenant Approvals', to: '/owner/tenant-review/approvals' },
                            { label: 'Tenant Complaints', to: '/owner/tenant-review/complaints' },
                            { label: 'Tenant Payments', to: '/owner/tenant-review/payments' },
                            { label: 'Tenant Absences', to: '/owner/tenant-review/absences' },
                            { label: 'Tenant Profile Updates', to: '/owner/tenant-review/profiles' },
                          ]}
                        />
                      }
                    >
                      <Route index element={<OwnerOverviewPage />} />
                      <Route path="add" element={<OwnerAddPgPage />} />
                      <Route path="residents" element={<OwnerResidentsPage />} />
                      <Route path="inventory" element={<OwnerInventoryPage />} />
                      <Route path="enquiries" element={<OwnerEnquiriesPage />} />
                      <Route path="balance-sheet" element={<OwnerBalanceSheetPage />} />
                      <Route path="documents" element={<OwnerDocumentsPage />} />
                      <Route path="staff" element={<OwnerStaffPage />} />
                      <Route path="tenant-review">
                        <Route index element={<Navigate to="approvals" replace />} />
                        <Route path="approvals" element={<TenantReviewApprovalsPage />} />
                        <Route path="complaints" element={<TenantReviewComplaintsPage />} />
                        <Route path="payments" element={<TenantReviewPaymentsPage />} />
                        <Route path="absences" element={<TenantReviewAbsencesPage />} />
                        <Route path="profiles" element={<TenantReviewProfilesPage />} />
                      </Route>
                    </Route>
                  </Route>

                  <Route element={<ProtectedRoute allow="tenant" />}>
                    <Route
                      path="/tenant"
                      element={
                        <DashboardLayout
                          title="Tenant"
                          links={[
                            { label: 'Overview', to: '/tenant/overview' },
                            { label: 'Complaints', to: '/tenant/complaints' },
                            { label: 'Rent Payments', to: '/tenant/payments' },
                            { label: 'Absences', to: '/tenant/absences' },
                            { label: 'Profile Requests', to: '/tenant/profile-requests' },
                          ]}
                        />
                      }
                    >
                      <Route index element={<Navigate to="overview" replace />} />
                      <Route path="overview" element={<TenantOverviewPage />} />
                      <Route path="complaints" element={<TenantComplaintsPage />} />
                      <Route path="payments" element={<TenantPaymentsPage />} />
                      <Route path="absences" element={<TenantAbsencesPage />} />
                      <Route path="profile-requests" element={<TenantProfileRequestsPage />} />
                    </Route>
                  </Route>

                  <Route element={<ProtectedRoute allow="admin" />}>
                    <Route
                      path="/admin"
                      element={
                        <DashboardLayout
                          title="Admin"
                          links={[
                            { label: 'Overview', to: '/admin' },
                            { label: 'PGs', to: '/admin/pgs' },
                            { label: 'Owners', to: '/admin/owners' },
                            { label: 'Residents', to: '/admin/residents' },
                            { label: 'Approvals', to: '/admin/approvals' },
                            { label: 'Enquiries', to: '/admin/enquiries' },
                            { label: 'Users', to: '/admin/users' },
                            { label: 'Form Config', to: '/admin/form-config' },
                            { label: 'Balance Sheet', to: '/admin/balance-sheet' },
                            { label: 'Tenant Approvals', to: '/admin/tenant-review/approvals' },
                            { label: 'Tenant Complaints', to: '/admin/tenant-review/complaints' },
                            { label: 'Tenant Payments', to: '/admin/tenant-review/payments' },
                            { label: 'Tenant Absences', to: '/admin/tenant-review/absences' },
                            { label: 'Tenant Profile Updates', to: '/admin/tenant-review/profiles' },
                          ]}
                        />
                      }
                    >
                      <Route index element={<AdminOverviewPage />} />
                      <Route path="pgs" element={<AdminPgsPage />} />
                      <Route path="owners" element={<AdminOwnersPage />} />
                      <Route path="residents" element={<AdminResidentsPage />} />
                      <Route path="approvals" element={<AdminOwnerApprovalsPage />} />
                      <Route path="enquiries" element={<AdminEnquiriesPage />} />
                      <Route path="users" element={<AdminUsersPage />} />
                      <Route path="form-config" element={<AdminFormConfigPage />} />
                      <Route path="balance-sheet" element={<AdminBalanceSheetPage />} />
                      <Route path="tenant-review">
                        <Route index element={<Navigate to="approvals" replace />} />
                        <Route path="approvals" element={<TenantReviewApprovalsPage />} />
                        <Route path="complaints" element={<TenantReviewComplaintsPage />} />
                        <Route path="payments" element={<TenantReviewPaymentsPage />} />
                        <Route path="absences" element={<TenantReviewAbsencesPage />} />
                        <Route path="profiles" element={<TenantReviewProfilesPage />} />
                      </Route>
                    </Route>
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>
            <ModuleHelpButton />
            <Footer />
            <AppToaster />
          </BrowserRouter>
        </StoreProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
