import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/auth.jsx";

const baseNav = [
  { label: "Dashboard", to: "/tenants/:tenantId" },
  { label: "Tasks", to: "/tenants/:tenantId/tasks" },
  { label: "DSR", to: "/tenants/:tenantId/dsr" },
  { label: "Reports", to: "/tenants/:tenantId/reports" },
  { label: "Members", to: "/tenants/:tenantId/members" },
  { label: "AI Insights", to: "/tenants/:tenantId/ai" }
];

const roleExtras = {
  "Super Admin": [
    { label: "Global Audit", to: "/tenants/:tenantId/audit" },
    { label: "Billing", to: "/tenants/:tenantId/billing" },
    { label: "Settings", to: "/tenants/:tenantId/settings" }
  ],
  "Tenant Admin": [
    { label: "Billing", to: "/tenants/:tenantId/billing" },
    { label: "Settings", to: "/tenants/:tenantId/settings" }
  ],
  Manager: [{ label: "Manager Review", to: "/tenants/:tenantId/manager-review" }],
  Developer: []
};

const Sidebar = () => {
  const { activeTenant, user } = useAuth();
  const tenantId = activeTenant?.id || "t-001";
  const role = user?.role || "Developer";
  const items = [...baseNav, ...(roleExtras[role] || [])];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-chip">DSR</span>
        <div>
          <p className="brand-title">DSR Platform</p>
          <p className="brand-sub">Identity + AI</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => {
          const path = item.to.replace(":tenantId", tenantId);
          return (
            <NavLink key={item.label} to={path} className="nav-link">
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <NavLink to="/tenants" className="nav-link">
          Switch Tenant
        </NavLink>
        <NavLink to="/account/profile" className="nav-link">
          Profile & Security
        </NavLink>
        <NavLink to="/account/sessions" className="nav-link">
          Sessions
        </NavLink>
        <NavLink to="/ai" className="nav-link">
          AI Control Center
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
