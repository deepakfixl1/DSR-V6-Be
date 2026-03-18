import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TenantLayout from "../../components/layout/TenantLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { useAuth } from "../../context/auth.jsx";
import { tenantApi } from "../../api/tenants.js";

const TenantSwitcher = () => {
  const { tenants, setTenants, setActiveTenantId } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await tenantApi.listMyTenants();
        if (Array.isArray(data)) setTenants(data);
      } catch {
        // keep mock
      }
    };
    load();
  }, [setTenants]);

  const switchTenant = (tenantId) => {
    setActiveTenantId(tenantId);
    navigate(`/tenants/${tenantId}`);
  };

  return (
    <TenantLayout>
      <div className="page-head">
        <div>
          <h2>Tenant Switcher</h2>
          <p>Select a workspace to enter its role-based dashboard.</p>
        </div>
        <div className="page-actions">
          <Button variant="ghost">Create Tenant</Button>
          <Button variant="primary">Join via Invite</Button>
        </div>
      </div>
      {tenants.length === 0 ? (
        <div className="empty-state">
          <h3>No tenants found</h3>
          <p>Create a tenant or join using an invite to get started.</p>
        </div>
      ) : (
        <div className="card-grid">
          {tenants.map((tenant) => (
            <div key={tenant.id} className="card">
              <div className="card-body">
                <h3>{tenant.name}</h3>
                <p>Role: {tenant.role}</p>
                <div className="row">
                  <Badge tone="neutral">Last active {tenant.lastActive}</Badge>
                  <Button variant="ghost" onClick={() => switchTenant(tenant.id)}>
                    Switch Tenant
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </TenantLayout>
  );
};

export default TenantSwitcher;
