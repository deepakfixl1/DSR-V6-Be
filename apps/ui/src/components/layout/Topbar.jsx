import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/auth.jsx";
import { notificationApi } from "../../api/notifications.js";
import ModeToggle from "../ui/ModeToggle.jsx";
import Badge from "../ui/Badge.jsx";

const roles = ["Super Admin", "Tenant Admin", "Manager", "Developer"];

const Topbar = () => {
  const { activeTenant, user, setRole } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const data = await notificationApi.getUnreadCount();
        if (mounted) setUnread(data?.count ?? 0);
      } catch {
        if (mounted) setUnread(3);
      }
    };

    refresh();
    const timer = setInterval(refresh, 20000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <header className="topbar">
      <div>
        <h2>{activeTenant?.name || "Tenant Workspace"}</h2>
        <p>Role: {user?.role}</p>
      </div>
      <div className="topbar-actions">
        <Badge tone="accent">Score 87</Badge>
        <div className="notif-pill">
          <span>Notifications</span>
          <strong>{unread}</strong>
        </div>
        <ModeToggle />
        <select
          className="role-select"
          value={user?.role}
          onChange={(event) => setRole(event.target.value)}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
};

export default Topbar;
