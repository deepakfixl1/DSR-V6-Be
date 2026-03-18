import React, { useState } from "react";
import TenantLayout from "../../components/layout/TenantLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { apiCatalog } from "../../api/catalog.js";

const ApiConsole = () => {
  const [results, setResults] = useState({});

  const runSample = async (key, item) => {
    try {
      const payload = item.sample || {};
      const data = await item.run(payload);
      setResults((prev) => ({ ...prev, [key]: JSON.stringify(data, null, 2) }));
    } catch (error) {
      setResults((prev) => ({ ...prev, [key]: error.message }));
    }
  };

  return (
    <TenantLayout>
      <div className="page-head">
        <div>
          <h2>API Console</h2>
          <p>Coverage for every API endpoint in the platform.</p>
        </div>
      </div>
      <div className="stack">
        {apiCatalog.map((group) => (
          <Card key={group.group} title={group.group} subtitle="Endpoints">
            <div className="api-grid">
              {group.items.map((item, index) => {
                const key = `${group.group}-${index}`;
                return (
                  <div key={key} className="api-item">
                    <div>
                      <strong>{item.method}</strong> <span>{item.path}</span>
                      <p>{item.label}</p>
                    </div>
                    <Button variant="ghost" onClick={() => runSample(key, item)}>
                      Run Sample
                    </Button>
                    {item.sample && (
                      <pre className="code">{JSON.stringify(item.sample, null, 2)}</pre>
                    )}
                    {results[key] && <pre className="code">{results[key]}</pre>}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </TenantLayout>
  );
};

export default ApiConsole;
