import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import { authApi } from "../../api/auth.js";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", otp: "" });
  const [status, setStatus] = useState("");

  const verify = async (event) => {
    event.preventDefault();
    await authApi.verifyEmail(form);
    navigate("/login");
  };

  const resend = async () => {
    setStatus("Sending...");
    await authApi.resendVerification({ email: form.email });
    setStatus("OTP sent.");
  };

  return (
    <AuthLayout>
      <h2>Verify Your Email</h2>
      <p>Confirm your identity before accessing tenants.</p>
      <form className="form" onSubmit={verify}>
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
        {status && <div className="status">{status}</div>}
        <div className="row">
          <Button type="submit">Verify</Button>
          <Button type="button" variant="ghost" onClick={resend}>
            Resend OTP
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
};

export default VerifyEmail;
