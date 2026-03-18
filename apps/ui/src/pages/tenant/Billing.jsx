import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import TenantLayout from "../../components/layout/TenantLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { billingApi } from "../../api/billing.js";

const Billing = () => {
  const { tenantId } = useParams();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const planData = await billingApi.listPlans();
        if (Array.isArray(planData)) setPlans(planData);
      } catch {
        setPlans([
          { id: "plan-1", name: "Growth", price: 399 },
          { id: "plan-2", name: "Enterprise", price: 999 }
        ]);
      }

      try {
        const sub = await billingApi.getSubscription(tenantId);
        if (sub) setSubscription(sub);
      } catch {
        setSubscription({ status: "active", plan: "Growth" });
      }
    };
    load();
  }, [tenantId]);

  return (
    <TenantLayout>
      <div className="page-head">
        <div>
          <h2>Billing</h2>
          <p>Plan management and subscription control.</p>
        </div>
      </div>
      <div className="card-grid">
        <Card title="Subscription" subtitle="Current">
          <p>Status: {subscription?.status || "inactive"}</p>
          <p>Plan: {subscription?.plan || "None"}</p>
          <Button variant="ghost">Upgrade</Button>
        </Card>
        {plans.map((plan) => (
          <Card key={plan.id} title={plan.name} subtitle={`$${plan.price}/mo`}>
            <Button variant="ghost">Select Plan</Button>
          </Card>
        ))}
      </div>
    </TenantLayout>
  );
};

export default Billing;
