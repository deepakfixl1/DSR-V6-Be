import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import TenantLayout from "../../components/layout/TenantLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { tenantApi } from "../../api/tenants.js";
import { departmentApi } from "../../api/departments.js";

const Settings = () => {
  const { tenantId } = useParams();
  const [settings, setSettings] = useState({ timezone: "America/New_York", workWeek: "Mon-Fri" });
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await tenantApi.getSettings(tenantId);
        if (data) setSettings({
          timezone: data.timezone || "America/New_York",
          workWeek: data.workWeek || "Mon-Fri"
        });
      } catch {
        // fallback
      }

      try {
        const dept = await departmentApi.list(tenantId);
        if (Array.isArray(dept)) setDepartments(dept);
      } catch {
        setDepartments([{ id: "dept-1", name: "Engineering" }]);
      }
    };
    load();
  }, [tenantId]);

  const save = async () => {
    await tenantApi.updateSettings(tenantId, settings);
  };

  return (
    <TenantLayout>
      <div className="page-head">
        <div>
          <h2>Tenant Settings</h2>
          <p>Workspace configuration, departments, and admin controls.</p>
        </div>
      </div>
      <div className="card-grid">
        <Card title="Workspace Settings" subtitle="Timezone and cadence">
          <label>
            Timezone
            <input
              type="text"
              value={settings.timezone}
              onChange={(event) => setSettings({ ...settings, timezone: event.target.value })}
            />
          </label>
          <label>
            Work Week
            <input
              type="text"
              value={settings.workWeek}
              onChange={(event) => setSettings({ ...settings, workWeek: event.target.value })}
            />
          </label>
          <Button variant="ghost" onClick={save}>
            Save Settings
          </Button>
        </Card>
        <Card title="Departments" subtitle="Structure teams">
          <ul className="list">
            {departments.map((dept) => (
              <li key={dept.id}>{dept.name}</li>
            ))}
          </ul>
          <Button variant="ghost">Add Department</Button>
        </Card>
        <Card title="Admin Tools" subtitle="Governance">
          <ul className="list">
            <li>
              <Link to={`/tenants/${tenantId}/audit`}>Audit Logs</Link>
            </li>
            <li>
              <Link to={`/tenants/${tenantId}/settings/api`}>API Console</Link>
            </li>
          </ul>
        </Card>
      </div>
    </TenantLayout>
  );
};

export default Settings;
