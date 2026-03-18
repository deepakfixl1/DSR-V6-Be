import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import TenantLayout from "../../components/layout/TenantLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import { membershipApi } from "../../api/membership.js";
import { members as fallbackMembers } from "../../data/mock.js";

const Members = () => {
  const { tenantId } = useParams();
  const [members, setMembers] = useState(fallbackMembers);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await membershipApi.listMembers(tenantId);
        if (Array.isArray(data)) setMembers(data);
      } catch {
        setMembers(fallbackMembers);
      }
    };
    load();
  }, [tenantId]);

  const invite = async () => {
    await membershipApi.inviteMember(tenantId, {
      email: "new@dsr.io",
      role: "Developer"
    });
  };

  return (
    <TenantLayout>
      <div className="page-head">
        <div>
          <h2>Members</h2>
          <p>Manage tenant membership, roles, and ownership.</p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" onClick={invite}>
            Invite Member
          </Button>
        </div>
      </div>
      <DataTable
        columns={["Name", "Role", "Productivity", "Status"]}
        rows={members.map((member) => [
          member.name,
          member.role,
          `${member.productivity}%`,
          member.status
        ])}
      />
    </TenantLayout>
  );
};

export default Members;
