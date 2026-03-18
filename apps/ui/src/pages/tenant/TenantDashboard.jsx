import React, { useEffect, useState } from "react";
import TenantLayout from "../../components/layout/TenantLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Stat from "../../components/ui/Stat.jsx";
import ChartPlaceholder from "../../components/ui/ChartPlaceholder.jsx";
import { reportApi } from "../../api/reports.js";

const TenantDashboard = () => {
  const [stats, setStats] = useState({ reports: 24, compliance: 92, aiScore: 88 });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await reportApi.getStats();
        if (data) setStats({
          reports: data?.totalRuns ?? 24,
          compliance: data?.complianceScore ?? 92,
          aiScore: data?.aiScore ?? 88
        });
      } catch {
        // keep fallback
      }
    };
    load();
  }, []);

  return (
    <TenantLayout>
      <div className="page-head">
        <div>
          <h2>Workspace Dashboard</h2>
          <p>Data-first tenant overview with live scorecards.</p>
        </div>
      </div>
      <div className="kpi-grid">
        <Card title="Reports Run" subtitle="Last 30 days">
          <Stat label="Total" value={stats.reports} trend="+12%" />
        </Card>
        <Card title="Compliance Score" subtitle="Tenant health">
          <Stat label="Score" value={`${stats.compliance}%`} trend="+3%" />
        </Card>
        <Card title="AI Productivity" subtitle="Team uplift">
          <Stat label="Score" value={`${stats.aiScore}%`} trend="+6%" />
        </Card>
      </div>
      <div className="card-grid">
        <Card title="Productivity Trend" subtitle="Weekly">
          <ChartPlaceholder title="Weekly productivity trend" />
        </Card>
        <Card title="Risk Alerts" subtitle="AI insights">
          <ul className="list">
            <li>2 members with declining velocity</li>
            <li>1 project overdue with high blocker ratio</li>
            <li>DSR submission rate at 94%</li>
          </ul>
        </Card>
      </div>
    </TenantLayout>
  );
};

export default TenantDashboard;
