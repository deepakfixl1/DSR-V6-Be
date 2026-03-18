import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import { authApi } from "../../api/auth.js";

const strengthLabel = (value) => {
  if (value.length > 10) return "Strong";
  if (value.length > 6) return "Medium";
  if (value.length > 0) return "Weak";
  return "";
};

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    inviteCode: "",
    otp: ""
  });
  const strength = useMemo(() => strengthLabel(form.password), [form.password]);

  const submit = async (event) => {
    event.preventDefault();
    await authApi.signup(form);
    navigate("/verify-email");
  };

  return (
    <AuthLayout>
      <h2>Create Your Workspace Identity</h2>
      <p>Join by invite or create a new organization.</p>
      <form className="form" onSubmit={submit}>
        <label>
          Organization Invite (optional)
          <input
            type="text"
            placeholder="INVITE-XXXX"
            value={form.inviteCode}
            onChange={(event) => setForm({ ...form, inviteCode: event.target.value })}
          />
        </label>
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
            placeholder="Create a strong password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
          <span className={`password-strength ${strength.toLowerCase()}`}>{strength}</span>
        </label>
        <label>
          Email OTP Verification
          <input
            type="text"
            placeholder="6-digit code"
            value={form.otp}
            onChange={(event) => setForm({ ...form, otp: event.target.value })}
          />
        </label>
        <Button type="submit">Create Account</Button>
        <div className="form-footer">
          <Link to="/login">Already have access?</Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Register;
