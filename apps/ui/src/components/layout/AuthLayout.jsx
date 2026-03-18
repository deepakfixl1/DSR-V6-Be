import React from "react";
import { Link } from "react-router-dom";

const AuthLayout = ({ children }) => {
  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="brand-chip">DSR</div>
        <div>
          <h1>Daily Status Reports</h1>
          <p>Enterprise identity, tenant isolation, and AI productivity analytics.</p>
        </div>
        <div className="auth-links">
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      </div>
      <div className="auth-card">{children}</div>
    </div>
  );
};

export default AuthLayout;
