import React, { useEffect, useState } from "react";
import TenantLayout from "../../components/layout/TenantLayout.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import { auditApi } from "../../api/audit.js";

const fallback = [
  { id: "audit-1", action: "Member invite", actor: "Admin", time: "1h ago" },
  { id: "audit-2", action: "Report export", actor: "Manager", time: "2h ago" }
];

const Audit = () => {
  const [logs, setLogs] = useState(fallback);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await auditApi.list();
        if (Array.isArray(data)) setLogs(data);
      } catch {
        setLogs(fallback);
      }
    };
    load();
  }, []);

  return (
    <TenantLayout>
      <div className="page-head">
        <div>
          <h2>Audit Logs</h2>
          <p>Admin-only visibility into system actions.</p>
        </div>
      </div>
      <DataTable
        columns={["Action", "Actor", "Time"]}
        rows={logs.map((log) => [log.action, log.actor, log.time])}
      />
    </TenantLayout>
  );
};

export default Audit;
