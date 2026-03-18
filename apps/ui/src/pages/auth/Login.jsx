import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import { authApi } from "../../api/auth.js";

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [status, setStatus] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setStatus("Authenticating...");
    try {
      const response = await authApi.login(form);
      if (response?.mfaRequired) {
        navigate("/mfa");
        return;
      }
      if (response?.emailVerified === false) {
        navigate("/verify-email");
        return;
      }
      navigate("/tenants");
    } catch (error) {
      setStatus("Login failed. Check credentials.");
    }
  };

  return (
    <AuthLayout>
      <h2>Enterprise Login</h2>
      <p>Secure access with MFA and device trust.</p>
      <form className="form" onSubmit={submit}>
        <label>
          Email
          <input
            type="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={form.remember}
            onChange={(event) => setForm({ ...form, remember: event.target.checked })}
          />
          Remember this device
        </label>
        {status && <div className="status">{status}</div>}
        <Button type="submit">Login</Button>
        <div className="form-footer">
          <Link to="/forgot">Forgot password?</Link>
          <Link to="/register">Create account</Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Login;
