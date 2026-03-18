import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import TenantLayout from "../../components/layout/TenantLayout.jsx";
import SplitPane from "../../components/ui/SplitPane.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { taskApi } from "../../api/tasks.js";
import { aiReportApi } from "../../api/aiReport.js";
import { dsrDraft, tasks as fallbackTasks, aiInsights } from "../../data/mock.js";

const Dsr = () => {
  const { tenantId } = useParams();
  const [draft, setDraft] = useState(dsrDraft);
  const [tasks, setTasks] = useState(fallbackTasks);
  const [aiSummary, setAiSummary] = useState("AI panel ready.");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await taskApi.list(tenantId);
        if (Array.isArray(data)) setTasks(data);
      } catch {
        setTasks(fallbackTasks);
      }
    };
    load();
  }, [tenantId]);

  const generate = async () => {
    try {
      const result = await aiReportApi.generateDSR({ tenantId, content: draft });
      setAiSummary(result?.summary || "DSR generated with AI insights.");
    } catch {
      setAiSummary("AI summary: consistent updates, minor clarity tweaks recommended.");
    }
  };

  return (
    <TenantLayout>
      <div className="page-head">
        <div>
          <h2>Daily Status Report</h2>
          <p>Copilot-like DSR drafting with performance intelligence.</p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" onClick={generate}>
            Generate AI Summary
          </Button>
          <Button>Submit DSR</Button>
        </div>
      </div>
      <SplitPane
        left={
          <div className="stack">
            <Card title="DSR Editor" subtitle="Editable content with tasks auto-fetched">
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
            </Card>
            <Card title="Tasks Snapshot" subtitle="Auto-fetched">
              <div className="list">
                {tasks.map((task) => (
                  <div key={task.id} className="list-item">
                    <span>{task.title}</span>
                    <Badge tone="neutral">{task.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Manual Notes" subtitle="Add blockers or highlights">
              <textarea placeholder="Add manual notes..." />
            </Card>
          </div>
        }
        right={
          <div className="stack">
            <Card title="AI Suggestions" subtitle="Executive clarity">
              <p>{aiSummary}</p>
            </Card>
            <Card title="Productivity Insights" subtitle="Scored feedback">
              <div className="kpi-grid">
                {aiInsights.map((insight) => (
                  <div key={insight.label} className="kpi-mini">
                    <span>{insight.label}</span>
                    <strong>{insight.value}</strong>
                    <em>{insight.trend}</em>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="AI Review" subtitle="Tone + clarity">
              <ul className="list">
                <li>Tone is professional, adjust for brevity.</li>
                <li>Missed deadlines: 1 task from last sprint.</li>
                <li>Completion score: 88%.</li>
              </ul>
            </Card>
          </div>
        }
      />
    </TenantLayout>
  );
};

export default Dsr;
