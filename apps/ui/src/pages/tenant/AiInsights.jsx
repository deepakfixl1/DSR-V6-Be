import React, { useState } from "react";
import TenantLayout from "../../components/layout/TenantLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { aiApi } from "../../api/ai.js";

const AiInsights = () => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("AI insights ready.");

  const submit = async () => {
    try {
      const data = await aiApi.assistantQuery({ prompt });
      setResponse(data?.answer || "AI assistant responded.");
    } catch {
      setResponse("AI: Prioritize high-impact tasks and reduce handoff friction.");
    }
  };

  return (
    <TenantLayout>
      <div className="page-head">
        <div>
          <h2>AI Insights</h2>
          <p>Performance trends, weak areas, and suggested improvements.</p>
        </div>
      </div>
      <div className="card-grid">
        <Card title="Performance Trend" subtitle="Member view">
          <ul className="list">
            <li>Peak focus hours: 9 AM - 12 PM</li>
            <li>Weak area: context switching</li>
            <li>Suggested skills: prioritization</li>
          </ul>
        </Card>
        <Card title="Team Health" subtitle="Manager view">
          <ul className="list">
            <li>Underperforming members: 2</li>
            <li>Overloaded members: 1</li>
            <li>Risk probability: 18%</li>
          </ul>
        </Card>
        <Card title="Tenant Health" subtitle="Admin view">
          <ul className="list">
            <li>Plan exhaustion: 72%</li>
            <li>Renewal likelihood: 91%</li>
            <li>Growth insight: add AI seats</li>
          </ul>
        </Card>
      </div>
      <Card title="Ask the AI" subtitle="Assistant query">
        <div className="row">
          <input
            type="text"
            placeholder="Ask about team performance"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <Button variant="ghost" onClick={submit}>
            Run
          </Button>
        </div>
        <p>{response}</p>
      </Card>
    </TenantLayout>
  );
};

export default AiInsights;
