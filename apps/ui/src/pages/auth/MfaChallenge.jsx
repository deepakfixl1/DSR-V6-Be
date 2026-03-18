import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layout/AuthLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import { mfaApi } from "../../api/mfa.js";

const MfaChallenge = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", token: "" });

  const submit = async (event) => {
    event.preventDefault();
    await mfaApi.verifyMFA(form);
    navigate("/tenants");
  };

  return (
    <AuthLayout>
      <h2>MFA Challenge</h2>
      <p>Enter your authenticator code to continue.</p>
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
          MFA Code
          <input
            type="text"
            placeholder="123456"
            value={form.token}
            onChange={(event) => setForm({ ...form, token: event.target.value })}
            required
          />
        </label>
        <Button type="submit">Verify & Continue</Button>
      </form>
    </AuthLayout>
  );
};

export default MfaChallenge;
