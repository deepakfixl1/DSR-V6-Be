import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import VerifyEmail from "./pages/auth/VerifyEmail.jsx";
import MfaChallenge from "./pages/auth/MfaChallenge.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import ResetPassword from "./pages/auth/ResetPassword.jsx";
import Sessions from "./pages/account/Sessions.jsx";
import ProfileSecurity from "./pages/account/ProfileSecurity.jsx";
import TenantSwitcher from "./pages/tenant/TenantSwitcher.jsx";
import TenantDashboard from "./pages/tenant/TenantDashboard.jsx";
import Tasks from "./pages/tenant/Tasks.jsx";
import Dsr from "./pages/tenant/Dsr.jsx";
import Reports from "./pages/tenant/Reports.jsx";
import Members from "./pages/tenant/Members.jsx";
import AiInsights from "./pages/tenant/AiInsights.jsx";
import Settings from "./pages/tenant/Settings.jsx";
import Billing from "./pages/tenant/Billing.jsx";
import Audit from "./pages/tenant/Audit.jsx";
import ManagerReview from "./pages/tenant/ManagerReview.jsx";
import ApiConsole from "./pages/tenant/ApiConsole.jsx";
import AiControlCenter from "./pages/ai/AiControlCenter.jsx";
import AiReport from "./pages/ai/AiReport.jsx";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/mfa" element={<MfaChallenge />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/reset" element={<ResetPassword />} />

      <Route path="/account/sessions" element={<Sessions />} />
      <Route path="/account/profile" element={<ProfileSecurity />} />

      <Route path="/tenants" element={<TenantSwitcher />} />
      <Route path="/tenants/:tenantId" element={<TenantDashboard />} />
      <Route path="/tenants/:tenantId/tasks" element={<Tasks />} />
      <Route path="/tenants/:tenantId/dsr" element={<Dsr />} />
      <Route path="/tenants/:tenantId/reports" element={<Reports />} />
      <Route path="/tenants/:tenantId/members" element={<Members />} />
      <Route path="/tenants/:tenantId/ai" element={<AiInsights />} />
      <Route path="/tenants/:tenantId/settings" element={<Settings />} />
      <Route path="/tenants/:tenantId/settings/api" element={<ApiConsole />} />
      <Route path="/tenants/:tenantId/billing" element={<Billing />} />
      <Route path="/tenants/:tenantId/audit" element={<Audit />} />
      <Route path="/tenants/:tenantId/manager-review" element={<ManagerReview />} />

      <Route path="/ai" element={<AiControlCenter />} />
      <Route path="/ai/report" element={<AiReport />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
