import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import TenantLayout from "../../components/layout/TenantLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import ChartPlaceholder from "../../components/ui/ChartPlaceholder.jsx";
import Button from "../../components/ui/Button.jsx";
import { taskApi } from "../../api/tasks.js";
import { tasks as fallbackTasks } from "../../data/mock.js";

const Tasks = () => {
  const { tenantId } = useParams();
  const [items, setItems] = useState(fallbackTasks);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await taskApi.list(tenantId);
        if (Array.isArray(data)) setItems(data);
      } catch {
        setItems(fallbackTasks);
      }
    };
    load();
  }, [tenantId]);

  return (
    <TenantLayout>
      <div className="page-head">
        <div>
          <h2>My Tasks</h2>
          <p>Track priorities, status, and AI recommended next steps.</p>
        </div>
        <div className="page-actions">
          <Button variant="ghost">New Task</Button>
        </div>
      </div>
      <div className="card-grid">
        {items.map((task) => (
          <Card key={task.id} title={task.title} subtitle={`Due ${task.due}`}>
            <div className="row">
              <Badge tone="neutral">{task.status}</Badge>
              <Badge tone="accent">{task.priority}</Badge>
            </div>
            <p>Time Logged: {task.timeLogged}</p>
          </Card>
        ))}
      </div>
      <div className="card-grid">
        <Card title="AI Recommended Next Task" subtitle="Based on workload">
          <p>Finalize tenant settings after tackling API coverage for reporting.</p>
          <Button variant="ghost">Start Focus Session</Button>
        </Card>
        <Card title="Productivity Trend" subtitle="Last 14 days">
          <ChartPlaceholder title="Productivity trend" />
        </Card>
      </div>
    </TenantLayout>
  );
};

export default Tasks;
