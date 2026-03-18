import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TenantLayout from "../../components/layout/TenantLayout.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import Button from "../../components/ui/Button.jsx";
import { userApi } from "../../api/users.js";
import { mfaApi } from "../../api/mfa.js";
import { authApi } from "../../api/auth.js";
import { useAuth } from "../../context/auth.jsx";

const ProfileSecurity = () => {
  const [tab, setTab] = useState("Profile");
  const { user, setUser } = useAuth();
  const [mfaEnabled, setMfaEnabled] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await mfaApi.getStatus();
        setMfaEnabled(Boolean(data?.enabled));
      } catch {
        setMfaEnabled(false);
      }
    };
    load();
  }, []);

  const updateProfile = async (event) => {
    event.preventDefault();
    await userApi.updateMe({ name: user.name, timezone: user.timezone });
  };

  const toggleMfa = async () => {
    if (mfaEnabled) {
      await mfaApi.disableMFA({ token: "123456" });
      setMfaEnabled(false);
    } else {
      await mfaApi.setupTOTP({ userId: user.id });
      setMfaEnabled(true);
    }
  };

  const logoutAll = async () => {
    await authApi.logoutAll({});
  };

  return (
    <TenantLayout>
      <div className="page-head">
        <div>
          <h2>Profile & Security</h2>
          <p>Manage identity, MFA, and session control.</p>
        </div>
      </div>
      <Tabs tabs={["Profile", "Security"]} active={tab} onChange={setTab} />
      {tab === "Profile" && (
        <div className="card">
          <div className="card-body">
            <form className="form" onSubmit={updateProfile}>
              <label>
                Name
                <input
                  type="text"
                  value={user.name}
                  onChange={(event) => setUser({ ...user, name: event.target.value })}
                />
              </label>
              <label>
                Timezone
                <input
                  type="text"
                  value={user.timezone}
                  onChange={(event) => setUser({ ...user, timezone: event.target.value })}
                />
              </label>
              <Button type="submit">Save Profile</Button>
            </form>
          </div>
        </div>
      )}
      {tab === "Security" && (
        <div className="card-grid">
          <div className="card">
            <div className="card-body">
              <h3>Multi-Factor Authentication</h3>
              <p>Status: {mfaEnabled ? "Enabled" : "Disabled"}</p>
              <Button variant="ghost" onClick={toggleMfa}>
                {mfaEnabled ? "Disable MFA" : "Enable MFA"}
              </Button>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3>Passwords</h3>
              <p>Rotate your access keys routinely.</p>
              <Button variant="ghost">Change Password</Button>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3>Sessions</h3>
              <p>Review current logins.</p>
              <Link to="/account/sessions">View Sessions</Link>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3>Global Logout</h3>
              <p>Terminate all active sessions.</p>
              <Button variant="ghost" onClick={logoutAll}>
                Logout All
              </Button>
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  );
};

export default ProfileSecurity;
