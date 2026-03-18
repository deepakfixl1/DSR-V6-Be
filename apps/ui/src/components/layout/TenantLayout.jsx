import React from "react";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

const TenantLayout = ({ children }) => {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Topbar />
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
};

export default TenantLayout;
