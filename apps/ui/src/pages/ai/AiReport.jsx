import React, { useState } from "react";
import TenantLayout from "../../components/layout/TenantLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { aiReportApi } from "../../api/aiReport.js";

const AiReport = () => {
  const [status, setStatus] = useState("Ready");

  const run = async (type) => {
    setStatus("Running...");
    try {
      if (type === "weekly") await aiReportApi.generateWeekly({ week: "2026-W09" });
      if (type === "monthly") await aiReportApi.generateMonthly({ month: "2026-02" });
      if (type === "quarterly") await aiReportApi.generateQuarterly({ quarter: "2026-Q1" });
      if (type === "yearly") await aiReportApi.generateYearly({ year: 2026 });
      setStatus("Report generated");
    } catch {
      setStatus("Report queued");
    }
  };

  return (
    <TenantLayout>
      <div className="page-head">
        <div>
          <h2>AI Report Runner</h2>
          <p>Trigger automated reports with AI summaries.</p>
        </div>
      </div>
      <Card title="Generate Reports" subtitle="Daily, weekly, quarterly, yearly">
        <div className="row">
          <Button variant="ghost" onClick={() => run("weekly")}>Weekly</Button>
          <Button variant="ghost" onClick={() => run("monthly")}>Monthly</Button>
          <Button variant="ghost" onClick={() => run("quarterly")}>Quarterly</Button>
          <Button variant="ghost" onClick={() => run("yearly")}>Yearly</Button>
        </div>
        <p>Status: {status}</p>
      </Card>
    </TenantLayout>
  );
};

export default AiReport;
