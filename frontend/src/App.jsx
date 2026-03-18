import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import MainLayout from './components/layout/MainLayout'
import Dashboard from './pages/Dashboard'
import Tenants from './pages/Tenants'
import TenantDetail from './pages/TenantDetail'
import Users from './pages/Users'
import Billing from './pages/Billing'
import Security from './pages/Security'
import AuditLogs from './pages/AuditLogs'
import Reports from './pages/Reports'
import Notifications from './pages/Notifications'
import Support from './pages/Support'
import DevTools from './pages/DevTools'
import SystemConfig from './pages/SystemConfig'
import Analytics from './pages/Analytics'
import TeamManagement from './pages/TeamManagement'
import Integrations from './pages/Integrations'
import WorkflowAutomation from './pages/WorkflowAutomation'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="tenants/:id" element={<TenantDetail />} />
            <Route path="users" element={<Users />} />
            <Route path="billing" element={<Billing />} />
            <Route path="security" element={<Security />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="reports" element={<Reports />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="support" element={<Support />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="team" element={<TeamManagement />} />
            <Route path="developer" element={<DevTools />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="automation" element={<WorkflowAutomation />} />
            <Route path="system-config" element={<SystemConfig />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
