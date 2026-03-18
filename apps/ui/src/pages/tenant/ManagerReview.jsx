import React from "react";
import TenantLayout from "../../components/layout/TenantLayout.jsx";
import SplitPane from "../../components/ui/SplitPane.jsx";
import Card from "../../components/ui/Card.jsx";
import ChartPlaceholder from "../../components/ui/ChartPlaceholder.jsx";

const ManagerReview = () => {
  return (
    <TenantLayout>
      <div className="page-head">
        <div>
          <h2>Manager Review</h2>
          <p>Split view: employee DSR on the left, AI review on the right.</p>
        </div>
      </div>
      <SplitPane
        left={
          <div className="stack">
            <Card title="Employee DSR" subtitle="Jules Park - Week 09">
              <p>
                Completed migration of reporting engine. Blockers include pending API changes.
              </p>
            </Card>
            <Card title="Tasks Completed" subtitle="This week">
              <ul className="list">
                <li>Refactored DSR editor</li>
                <li>Automated weekly summaries</li>
                <li>Resolved tenant auth bug</li>
              </ul>
            </Card>
            <Card title="Weekly Trend" subtitle="Velocity">
              <ChartPlaceholder title="Weekly velocity" />
            </Card>
            <Card title="Attendance Pattern" subtitle="Last 30 days">
              <ChartPlaceholder title="Attendance" />
            </Card>
          </div>
        }
        right={
          <div className="stack">
            <Card title="AI Productivity Score" subtitle="Score 91">
              <p>Strong output with consistent delivery cadence.</p>
            </Card>
            <Card title="Risk Alerts" subtitle="Burnout prediction">
              <ul className="list">
                <li>Burnout probability: 14%</li>
                <li>Context switching: medium</li>
                <li>Suggested focus blocks: 2 per week</li>
              </ul>
            </Card>
            <Card title="Suggested Feedback" subtitle="Manager actions">
              <ul className="list">
                <li>Encourage delegation on analytics tasks.</li>
                <li>Highlight leadership potential.</li>
              </ul>
            </Card>
            <Card title="Promotion Readiness" subtitle="Executive score">
              <p>Readiness score: 82%</p>
            </Card>
          </div>
        }
      />
    </TenantLayout>
  );
};

export default ManagerReview;
