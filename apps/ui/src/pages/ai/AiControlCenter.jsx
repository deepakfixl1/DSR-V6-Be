import React from "react";
import TenantLayout from "../../components/layout/TenantLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import ChartPlaceholder from "../../components/ui/ChartPlaceholder.jsx";

const AiControlCenter = () => {
  return (
    <TenantLayout>
      <div className="page-head">
        <div>
          <h2>AI Control Center</h2>
          <p>Productivity health, risk prediction, and upgrade suggestions.</p>
        </div>
      </div>
      <div className="card-grid">
        <Card title="Member Performance" subtitle="Trend view">
          <ChartPlaceholder title="Performance trend" />
        </Card>
        <Card title="Team Health" subtitle="Manager intelligence">
          <ul className="list">
            <li>Health score: 86</li>
            <li>Underperforming: 2 members</li>
            <li>Overloaded: 1 member</li>
          </ul>
        </Card>
        <Card title="Tenant Health" subtitle="Admin view">
          <ul className="list">
            <li>Plan exhaustion prediction: 72%</li>
            <li>Renewal likelihood: 91%</li>
            <li>Upgrade plan suggestion: AI Pro</li>
          </ul>
        </Card>
      </div>
    </TenantLayout>
  );
};

export default AiControlCenter;
