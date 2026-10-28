import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
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

const OwnerOverviewPage = lazy(() => import('@/pages/OwnerPages').then((m) => ({ default: m.OwnerOverviewPage })))
const OwnerAddPgPage = lazy(() => import('@/pages/OwnerPages').then((m) => ({ default: m.OwnerAddPgPage })))
const OwnerEnquiriesPage = lazy(() => import('@/pages/OwnerPages').then((m) => ({ default: m.OwnerEnquiriesPage })))
const OwnerResidentsPage = lazy(() => import('@/pages/OwnerPages').then((m) => ({ default: m.OwnerResidentsPage })))

const AdminOverviewPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminOverviewPage })))
const AdminPgsPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminPgsPage })))
const AdminOwnersPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminOwnersPage })))
const AdminOwnerApprovalsPage = lazy(() =>
  import('@/pages/AdminPages').then((m) => ({ default: m.AdminOwnerApprovalsPage })),
)
const AdminEnquiriesPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminEnquiriesPage })))
const AdminResidentsPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminResidentsPage })))
const AdminUsersPage = lazy(() => import('@/pages/AdminPages').then((m) => ({ default: m.AdminUsersPage })))

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
                            { label: 'Enquiries', to: '/owner/enquiries' },
                          ]}
                        />
                      }
                    >
                      <Route index element={<OwnerOverviewPage />} />
                      <Route path="add" element={<OwnerAddPgPage />} />
                      <Route path="residents" element={<OwnerResidentsPage />} />
                      <Route path="enquiries" element={<OwnerEnquiriesPage />} />
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
                    </Route>
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
            <AppToaster />
          </BrowserRouter>
        </StoreProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
