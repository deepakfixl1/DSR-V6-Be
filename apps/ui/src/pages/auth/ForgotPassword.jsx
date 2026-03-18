import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import { authApi } from "../../api/auth.js";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setStatus("Sending reset link...");
    await authApi.forgotPassword({ email });
    setStatus("Check your inbox for the OTP.");
  };

  return (
    <AuthLayout>
      <h2>Reset Password</h2>
      <p>We will send you a secure OTP to reset access.</p>
      <form className="form" onSubmit={submit}>
        <label>
          Email
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        {status && <div className="status">{status}</div>}
        <Button type="submit">Send OTP</Button>
        <div className="form-footer">
          <Link to="/reset">I already have an OTP</Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ForgotPassword;
