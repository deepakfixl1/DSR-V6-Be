import React, { useEffect, useState } from "react";
import TenantLayout from "../../components/layout/TenantLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import ChartPlaceholder from "../../components/ui/ChartPlaceholder.jsx";
import { reportApi } from "../../api/reports.js";
import { aiReportApi } from "../../api/aiReport.js";
import { reports as fallbackReports } from "../../data/mock.js";

const Reports = () => {
  const [items, setItems] = useState(fallbackReports);
  const [summary, setSummary] = useState("AI summary ready.");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await reportApi.listTemplates();
        if (Array.isArray(data)) setItems(data);
      } catch {
        setItems(fallbackReports);
      }
    };
    load();
  }, []);

  const generateWeekly = async () => {
    try {
      const result = await aiReportApi.generateWeekly({ week: "2026-W09" });
      setSummary(result?.summary || "Weekly report generated.");
    } catch {
      setSummary("Weekly AI summary: productivity up 6%, risk down 4%.");
    }
  };

  return (
    <TenantLayout>
      <div className="page-head">
        <div>
          <h2>Reporting Engine</h2>
          <p>Daily, weekly, quarterly, and yearly performance intelligence.</p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" onClick={generateWeekly}>
            Generate Weekly
          </Button>
          <Button>Download PDF</Button>
        </div>
      </div>
      <div className="kpi-grid">
        {items.map((report) => (
          <Card key={report.id} title={report.title} subtitle={report.cadence}>
            <div className="score-badge">Score {report.score}</div>
            <p>Status: {report.status}</p>
          </Card>
        ))}
      </div>
      <div className="card-grid">
        <Card title="Productivity Trend" subtitle="KPI breakdown">
          <ChartPlaceholder title="KPI trend" />
        </Card>
        <Card title="AI Summary" subtitle="Executive brief">
          <p>{summary}</p>
          <Button variant="ghost">Share with Manager</Button>
        </Card>
      </div>
    </TenantLayout>
  );
};

export default Reports;
