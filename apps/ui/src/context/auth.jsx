import React, { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

const defaultUser = {
  id: "user-1",
  name: "Anita Rao",
  email: "anita.rao@dsr.io",
  role: "Manager",
  timezone: "America/New_York",
  avatar: "AR"
};

const mockTenants = [
  { id: "t-001", name: "Northwind Labs", role: "Tenant Admin", lastActive: "2h ago" },
  { id: "t-002", name: "Helios Systems", role: "Manager", lastActive: "Yesterday" },
  { id: "t-003", name: "Atlas Freight", role: "Developer", lastActive: "3d ago" }
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(defaultUser);
  const [tenants, setTenants] = useState(mockTenants);
  const [activeTenantId, setActiveTenantId] = useState(mockTenants[0]?.id || null);

  const activeTenant = tenants.find((tenant) => tenant.id === activeTenantId) || null;

  const value = useMemo(
    () => ({
      user,
      tenants,
      activeTenant,
      setUser,
      setTenants,
      setActiveTenantId,
      setRole: (role) => setUser((prev) => ({ ...prev, role }))
    }),
    [user, tenants, activeTenant]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
