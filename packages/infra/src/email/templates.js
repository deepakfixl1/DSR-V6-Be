export const templates = {
  otp: (otp, userName, purpose) => `
    <div style="font-family: Arial, sans-serif; line-height:1.5">
      <h2>Hello ${userName || "User"},</h2>
      <p>Your One-Time Password (OTP) for <strong>${purpose}</strong> is:</p>
      <h1 style="color: #007bff;">${otp}</h1>
      <p>This OTP is valid for 5 minutes. Do not share it with anyone.</p>
      <hr>
      <p>If you did not request this ${purpose}, please ignore this email.</p>
    </div>
  `,

  sellerOnboardAccepted: (sellerName, dashboardLink) => `
    <div style="font-family: Arial, sans-serif; line-height:1.5">
      <h2>Congratulations ${sellerName}!</h2>
      <p>Your seller application has been <strong>accepted</strong>.</p>
      <p>You can now log in to your dashboard and start listing your hotels:</p>
      <a href="${dashboardLink}" style="padding: 10px 15px; background: #007bff; color: white; text-decoration: none;">Go to Dashboard</a>
      <hr>
      <p>If you have any questions, contact our support team.</p>
    </div>
  `,

  sessionLoginAlert: (userName, device, ip, time, location) => `
    <div style="font-family: Arial, sans-serif; line-height:1.5">
      <h2>Hello ${userName},</h2>
      <p>We noticed a new login to your account:</p>
      <ul>
        <li>Device/Browser: ${device}</li>
        <li>IP Address: ${ip}</li>
        <li>Time: ${time}</li>
        <li>Location: ${location}</li>
      </ul>
      <p>If this was you, no action is needed. Otherwise, please secure your account immediately.</p>
      <hr>
      <p>Stay safe,</p>
      <p>YourApp Security Team</p>
    </div>
  `,

  accountSuspended: (userName, reason, supportLink) => `
    <div style="font-family: Arial, sans-serif; line-height:1.5">
      <h2>Dear ${userName},</h2>
      <p>Your account has been <strong>suspended</strong> due to the following reason:</p>
      <p>${reason}</p>
      <p>If you think this is a mistake, please contact support:</p>
      <a href="${supportLink}" style="color:#007bff;">Contact Support</a>
      <hr>
      <p>Regards,</p>
      <p>YourApp Team</p>
    </div>
  `,

  commissionPending: (sellerName, amount, payoutDate, dashboardLink) => `
    <div style="font-family: Arial, sans-serif; line-height:1.5">
      <h2>Hello ${sellerName},</h2>
      <p>You have a pending commission payout:</p>
      <ul>
        <li>Amount: <strong>${amount}</strong></li>
        <li>Expected payout date: <strong>${payoutDate}</strong></li>
      </ul>
      <p>Check your dashboard for more details:</p>
      <a href="${dashboardLink}" style="padding: 10px 15px; background: #007bff; color: white; text-decoration: none;">View Dashboard</a>
      <hr>
      <p>Thank you for partnering with us.</p>
    </div>
  `,

  adPurchaseConfirmation: (sellerName, hotelName, adName, startDate, endDate) => `
    <div style="font-family: Arial, sans-serif; line-height:1.5">
      <h2>Hello ${sellerName},</h2>
      <p>Your ad campaign has been successfully created:</p>
      <ul>
        <li>Hotel: ${hotelName}</li>
        <li>Ad Name: ${adName}</li>
        <li>Start Date: ${startDate}</li>
        <li>End Date: ${endDate}</li>
      </ul>
      <p>Visit your dashboard to monitor performance.</p>
    </div>
  `,

  forgotPasswordLink: (userName, resetLink) => `
    <div style="font-family: Arial, sans-serif; line-height:1.5">
      <h2>Hello ${userName || "User"},</h2>
      <p>We received a request to reset your password.</p>
      <p>
        <a href="${resetLink}" style="padding: 10px 15px; background: #ef4444; color: white; text-decoration: none;">Reset Password</a>
      </p>
      <p>If you did not request this reset, please ignore this email.</p>
    </div>
  `,

  emailVerification: (userName, verifyLink) => `
    <div style="font-family: Arial, sans-serif; line-height:1.5">
      <h2>Hello ${userName || "User"},</h2>
      <p>Thank you for signing up! Please verify your email address to activate your account.</p>
      <p>
        <a href="${verifyLink}" style="display:inline-block; padding: 10px 20px; background: #10b981; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
      </p>
      <p>This link expires in <strong>24 hours</strong>. If you did not create an account, you can safely ignore this email.</p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin: 16px 0;">
      <p style="font-size:12px; color:#6b7280;">If the button above does not work, copy and paste this URL into your browser:<br>${verifyLink}</p>
    </div>
  `,

  platformInvite: (inviteeName, inviterName, roleName, setPasswordLink) => `
    <div style="font-family: Arial, sans-serif; line-height:1.5">
      <h2>Hello ${inviteeName || "User"},</h2>
      <p><strong>${inviterName || "An administrator"}</strong> has invited you to join the Admin Portal as <strong>${roleName || "an admin"}</strong>.</p>
      <p>Click the link below to set your password and activate your account:</p>
      <p>
        <a href="${setPasswordLink}" style="padding: 10px 15px; background: #007bff; color: white; text-decoration: none;">Set Password</a>
      </p>
      <p>This link expires in 24 hours. If you did not expect this invite, you can ignore this email.</p>
    </div>
  `,

  tenantInvite: (inviteeName, inviterName, tenantName, acceptLink, expiresInDays) => `
    <div style="font-family: Arial, sans-serif; line-height:1.5">
      <h2>Hello ${inviteeName || "User"},</h2>
      <p><strong>${inviterName || "A team member"}</strong> has invited you to join the workspace <strong>${tenantName}</strong>.</p>
      <p>
        <a href="${acceptLink}" style="padding: 10px 15px; background: #007bff; color: white; text-decoration: none;">Accept invitation</a>
      </p>
      <p>This invitation expires in ${expiresInDays} days. If you did not expect this invite, you can ignore this email.</p>
    </div>
  `,

  tenantOwnerInvite: (ownerName, tenantName, inviterName, setPasswordLink, expiresInDays) => `
    <div style="font-family: Arial, sans-serif; line-height:1.5">
      <h2>Hello ${ownerName || "User"},</h2>
      <p><strong>${inviterName || "An administrator"}</strong> has invited you to become the <strong>owner</strong> of the workspace <strong>${tenantName}</strong>.</p>
      <p>Click the link below to set your password and activate your account. You will then be able to manage your workspace.</p>
      <p>
        <a href="${setPasswordLink}" style="padding: 10px 15px; background: #007bff; color: white; text-decoration: none;">Set Password &amp; Activate</a>
      </p>
      <p>This invitation expires in ${expiresInDays} days. If you did not expect this invite, you can ignore this email.</p>
    </div>
  `,

  reportDueReminder: (employeeName, reportType, deadlineTime, submitLink) => `
    <div style="font-family: Arial, sans-serif; line-height:1.6; max-width:600px;">
      <h2 style="color:#1e40af;">&#9201; Report Reminder</h2>
      <p>Hello <strong>${employeeName || "Team Member"}</strong>,</p>
      <p>This is a reminder that your <strong>${reportType}</strong> report is due soon.</p>
      <table style="border-collapse:collapse; width:100%; margin:12px 0;">
        <tr><td style="padding:6px 12px; background:#f1f5f9; font-weight:bold; border:1px solid #e2e8f0;">Report Type</td><td style="padding:6px 12px; border:1px solid #e2e8f0;">${reportType}</td></tr>
        <tr><td style="padding:6px 12px; background:#f1f5f9; font-weight:bold; border:1px solid #e2e8f0;">Deadline</td><td style="padding:6px 12px; border:1px solid #e2e8f0; color:#dc2626;">${deadlineTime}</td></tr>
      </table>
      <p>Please submit your report before the deadline to avoid any penalties.</p>
      <p>
        <a href="${submitLink}" style="display:inline-block; padding:10px 20px; background:#1e40af; color:white; text-decoration:none; border-radius:4px; font-weight:bold;">Submit Report Now</a>
      </p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:16px 0;">
      <p style="font-size:12px; color:#6b7280;">If you have already submitted your report, please ignore this email.</p>
    </div>
  `,

  lateSubmissionRequestReceived: (managerName, employeeName, reportType, reason, approveLink, rejectLink) => `
    <div style="font-family: Arial, sans-serif; line-height:1.6; max-width:600px;">
      <h2 style="color:#b45309;">&#128336; Late Submission Request</h2>
      <p>Hello <strong>${managerName || "Manager"}</strong>,</p>
      <p><strong>${employeeName}</strong> has requested permission to submit their <strong>${reportType}</strong> report after the deadline.</p>
      <div style="background:#fffbeb; border-left:4px solid #f59e0b; padding:12px 16px; margin:12px 0; border-radius:0 4px 4px 0;">
        <p style="margin:0; font-weight:bold;">Reason given:</p>
        <p style="margin:4px 0 0;">${reason}</p>
      </div>
      <p>Please review and respond to this request:</p>
      <p>
        <a href="${approveLink}" style="display:inline-block; padding:10px 20px; background:#16a34a; color:white; text-decoration:none; border-radius:4px; font-weight:bold; margin-right:8px;">Approve</a>
        <a href="${rejectLink}" style="display:inline-block; padding:10px 20px; background:#dc2626; color:white; text-decoration:none; border-radius:4px; font-weight:bold;">Reject</a>
      </p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:16px 0;">
      <p style="font-size:12px; color:#6b7280;">You can also review this request directly in your manager dashboard.</p>
    </div>
  `,

  lateSubmissionApproved: (employeeName, reportType, extendedDeadline, submitLink) => `
    <div style="font-family: Arial, sans-serif; line-height:1.6; max-width:600px;">
      <h2 style="color:#16a34a;">&#10003; Late Submission Approved</h2>
      <p>Hello <strong>${employeeName || "Team Member"}</strong>,</p>
      <p>Your request to submit your <strong>${reportType}</strong> report after the deadline has been <strong style="color:#16a34a;">approved</strong>.</p>
      <table style="border-collapse:collapse; width:100%; margin:12px 0;">
        <tr><td style="padding:6px 12px; background:#f0fdf4; font-weight:bold; border:1px solid #bbf7d0;">New Deadline</td><td style="padding:6px 12px; border:1px solid #bbf7d0; color:#16a34a; font-weight:bold;">${extendedDeadline}</td></tr>
      </table>
      <p>Please submit your report before the extended deadline.</p>
      <p>
        <a href="${submitLink}" style="display:inline-block; padding:10px 20px; background:#16a34a; color:white; text-decoration:none; border-radius:4px; font-weight:bold;">Submit Report</a>
      </p>
    </div>
  `,

  lateSubmissionRejected: (employeeName, reportType, managerNotes) => `
    <div style="font-family: Arial, sans-serif; line-height:1.6; max-width:600px;">
      <h2 style="color:#dc2626;">&#10007; Late Submission Request Rejected</h2>
      <p>Hello <strong>${employeeName || "Team Member"}</strong>,</p>
      <p>Your request to submit your <strong>${reportType}</strong> report after the deadline has been <strong style="color:#dc2626;">rejected</strong>.</p>
      ${managerNotes ? `<div style="background:#fef2f2; border-left:4px solid #dc2626; padding:12px 16px; margin:12px 0; border-radius:0 4px 4px 0;"><p style="margin:0; font-weight:bold;">Manager's note:</p><p style="margin:4px 0 0;">${managerNotes}</p></div>` : ""}
      <p>Please contact your manager if you have any questions.</p>
    </div>
  `,

  penaltyApplied: (employeeName, reportType, penaltyDescription, missedDeadline) => `
    <div style="font-family: Arial, sans-serif; line-height:1.6; max-width:600px;">
      <h2 style="color:#dc2626;">&#9888; Penalty Applied</h2>
      <p>Hello <strong>${employeeName || "Team Member"}</strong>,</p>
      <p>A penalty has been recorded for your missed <strong>${reportType}</strong> report submission.</p>
      <table style="border-collapse:collapse; width:100%; margin:12px 0;">
        <tr><td style="padding:6px 12px; background:#fef2f2; font-weight:bold; border:1px solid #fecaca;">Report Type</td><td style="padding:6px 12px; border:1px solid #fecaca;">${reportType}</td></tr>
        <tr><td style="padding:6px 12px; background:#fef2f2; font-weight:bold; border:1px solid #fecaca;">Missed Deadline</td><td style="padding:6px 12px; border:1px solid #fecaca;">${missedDeadline}</td></tr>
        <tr><td style="padding:6px 12px; background:#fef2f2; font-weight:bold; border:1px solid #fecaca;">Penalty</td><td style="padding:6px 12px; border:1px solid #fecaca; color:#dc2626;">${penaltyDescription}</td></tr>
      </table>
      <p>If you believe this penalty was applied in error, please contact your manager or HR department.</p>
    </div>
  `
};

export const templateSubjects = {
  otp: "Your OTP Code",
  sellerOnboardAccepted: "Seller Application Accepted",
  sessionLoginAlert: "New Login Alert",
  accountSuspended: "Account Suspended",
  commissionPending: "Commission Payout Pending",
  adPurchaseConfirmation: "Ad Purchase Confirmation",
  forgotPasswordLink: "Reset Your Password",
  emailVerification: "Verify Your Email",
  tenantInvite: "You're invited to join a workspace",
  platformInvite: "You're invited to the Admin Portal",
  tenantOwnerInvite: "You're invited to own a workspace",
  reportDueReminder: "Reminder: Your report is due soon",
  lateSubmissionRequestReceived: "Late Submission Request from Team Member",
  lateSubmissionApproved: "Your Late Submission Request has been Approved",
  lateSubmissionRejected: "Your Late Submission Request has been Rejected",
  penaltyApplied: "Penalty Applied for Missed Report Submission"
};
