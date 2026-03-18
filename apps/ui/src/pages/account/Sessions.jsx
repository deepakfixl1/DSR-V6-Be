import React, { useEffect, useState } from "react";
import TenantLayout from "../../components/layout/TenantLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import { userApi } from "../../api/users.js";

const fallbackSessions = [
  { tokenId: "tok-1", device: "MacBook Pro", ip: "192.168.1.12", lastActive: "2 min ago" },
  { tokenId: "tok-2", device: "iPhone 15", ip: "192.168.1.30", lastActive: "1 hour ago" }
];

const Sessions = () => {
  const [sessions, setSessions] = useState(fallbackSessions);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await userApi.getSessions();
        if (Array.isArray(data)) setSessions(data);
      } catch {
        setSessions(fallbackSessions);
      }
    };
    load();
  }, []);

  const revoke = async (tokenId) => {
    await userApi.revokeSession(tokenId);
    setSessions((prev) => prev.filter((session) => session.tokenId !== tokenId));
  };

  return (
    <TenantLayout>
      <div className="page-head">
        <div>
          <h2>Session Management</h2>
          <p>Track and revoke active sessions across devices.</p>
        </div>
      </div>
      <div className="card-grid">
        {sessions.map((session) => (
          <div key={session.tokenId} className="card">
            <div className="card-body">
              <h3>{session.device}</h3>
              <p>IP: {session.ip}</p>
              <p>Last Active: {session.lastActive}</p>
              <Button variant="ghost" onClick={() => revoke(session.tokenId)}>
                Revoke Session
              </Button>
            </div>
          </div>
        ))}
      </div>
    </TenantLayout>
  );
};

export default Sessions;
