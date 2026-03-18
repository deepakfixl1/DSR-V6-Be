import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import { authApi } from "../../api/auth.js";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", otp: "", password: "" });

  const submit = async (event) => {
    event.preventDefault();
    await authApi.resetPassword(form);
    navigate("/login");
  };

  return (
    <AuthLayout>
      <h2>Set New Password</h2>
      <p>Apply your OTP and a fresh password.</p>
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
          OTP Code
          <input
            type="text"
            placeholder="6-digit code"
            value={form.otp}
            onChange={(event) => setForm({ ...form, otp: event.target.value })}
            required
          />
        </label>
        <label>
          New Password
          <input
            type="password"
            placeholder="Create new password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
        </label>
        <Button type="submit">Update Password</Button>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;
