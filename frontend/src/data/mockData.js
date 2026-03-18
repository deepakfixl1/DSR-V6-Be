import { subDays, format, subMonths } from 'date-fns'

// ─── Helpers ────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const randFloat = (min, max, dec = 1) => parseFloat((Math.random() * (max - min) + min).toFixed(dec))

// ─── Tenant Plans ─────────────────────────────────────────────────────────
export const PLANS = {
  STARTER:    { id: 'starter',    label: 'Starter',    price: 49,   color: 'gray' },
  GROWTH:     { id: 'growth',     label: 'Growth',     price: 149,  color: 'blue' },
  BUSINESS:   { id: 'business',   label: 'Business',   price: 399,  color: 'violet' },
  ENTERPRISE: { id: 'enterprise', label: 'Enterprise', price: 999,  color: 'amber' },
}

// ─── Tenants ───────────────────────────────────────────────────────────────
const tenantNames = [
  'Acme Corp', 'Globex Systems', 'Initech Solutions', 'Umbrella Labs', 'Massive Dynamic',
  'Soylent Corp', 'Prestige Worldwide', 'Vandelay Industries', 'Bluth Company', 'Dunder Mifflin',
  'Hooli Technologies', 'Pied Piper', 'Bachman Capital', 'Raviga Partners', 'Galactic Empire',
  'Stark Industries', 'Wayne Enterprises', 'Oscorp Industries', 'LexCorp', 'Weyland-Yutani',
  'Tyrell Corporation', 'Cyberdyne Systems', 'OmniCorp', 'Solex Industries', 'Virtucon',
]

export const tenants = tenantNames.map((name, i) => ({
  id: `tenant_${String(i + 1).padStart(4, '0')}`,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
  plan: Object.values(PLANS)[i % 4],
  status: i % 12 === 0 ? 'suspended' : i % 7 === 0 ? 'trial' : 'active',
  members: rand(3, 250),
  revenue: rand(50, 2000),
  storage_used: rand(1, 95),
  storage_limit: 100,
  api_calls_used: rand(10000, 950000),
  api_calls_limit: 1000000,
  ai_tokens_used: rand(50000, 4800000),
  ai_tokens_limit: 5000000,
  created_at: subDays(new Date(), rand(30, 730)).toISOString(),
  last_active: subDays(new Date(), rand(0, 14)).toISOString(),
  owner_email: `admin@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
  country: ['US', 'UK', 'DE', 'IN', 'CA', 'AU', 'FR', 'JP'][i % 8],
  mfa_enabled: i % 3 !== 0,
  sso_enabled: i % 4 === 0,
  reports_submitted: rand(5, 450),
  custom_domain: i % 5 === 0 ? `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.dsr.io` : null,
}))

// ─── Users ─────────────────────────────────────────────────────────────────
const firstNames = ['Alex', 'Jordan', 'Morgan', 'Taylor', 'Casey', 'Riley', 'Quinn', 'Drew', 'Blake', 'Reese', 'Avery', 'Sage', 'Skyler', 'Rowan', 'Finley']
const lastNames  = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Thomas', 'Jackson', 'White']
const roles      = ['Super Admin', 'Billing Admin', 'Security Admin', 'Support Admin', 'Read-only Admin', 'Member', 'Manager', 'Analyst']

export const users = Array.from({ length: 60 }, (_, i) => {
  const fn = firstNames[i % firstNames.length]
  const ln = lastNames[i % lastNames.length]
  const tenant = tenants[i % tenants.length]
  return {
    id: `user_${String(i + 1).padStart(5, '0')}`,
    name: `${fn} ${ln}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${tenant.slug}.io`,
    role: roles[i % roles.length],
    tenant_id: tenant.id,
    tenant_name: tenant.name,
    status: i % 15 === 0 ? 'locked' : i % 8 === 0 ? 'inactive' : 'active',
    mfa_enabled: i % 3 !== 0,
    last_login: subDays(new Date(), rand(0, 60)).toISOString(),
    created_at: subDays(new Date(), rand(30, 500)).toISOString(),
    login_count: rand(10, 500),
    failed_logins: rand(0, 8),
    ip_address: `${rand(10,200)}.${rand(1,255)}.${rand(1,255)}.${rand(1,255)}`,
    verified: i % 10 !== 0,
    avatar_color: ['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4'][i % 6],
  }
})

// ─── Time-series data helpers ──────────────────────────────────────────────
const generateDailySeries = (days, base, variance, trend = 1) =>
  Array.from({ length: days }, (_, i) => ({
    date: format(subDays(new Date(), days - i - 1), 'MMM d'),
    value: Math.max(0, Math.round(base * trend * (1 + (i / days) * 0.3) + (Math.random() - 0.5) * variance)),
  }))

const generateMonthlySeries = (months, base, variance) =>
  Array.from({ length: months }, (_, i) => ({
    month: format(subMonths(new Date(), months - i - 1), 'MMM yyyy'),
    value: Math.max(0, Math.round(base * (1 + (i / months) * 0.5) + (Math.random() - 0.5) * variance)),
  }))

// ─── Dashboard KPIs ────────────────────────────────────────────────────────
export const dashboardKPIs = {
  totalTenants:        { value: tenants.length, change: +8.3, trend: 'up' },
  totalUsers:          { value: users.length * 12, change: +12.1, trend: 'up' },
  mrr:                 { value: 284750, change: +6.4, trend: 'up' },
  arr:                 { value: 3417000, change: +6.4, trend: 'up' },
  activeSubscriptions: { value: 22, change: +2, trend: 'up' },
  platformHealth:      { value: 99.97, change: +0.02, trend: 'up' },
}

// ─── Real-time metrics ─────────────────────────────────────────────────────
export const realtimeMetrics = {
  activeUsers: { '24h': 3847, '7d': 18293, '30d': 64821 },
  apiCallsPerMin: 2847,
  cpuUsage: 34,
  memoryUsage: 61,
  queueDepth: 142,
  wsConnections: 1204,
  errorRate: 0.04,
  p95Latency: 187,
}

// ─── Chart Data ────────────────────────────────────────────────────────────
export const tenantGrowthData = generateMonthlySeries(12, 8, 3)
export const revenueData = Array.from({ length: 12 }, (_, i) => ({
  month: format(subMonths(new Date(), 11 - i), 'MMM'),
  mrr:  Math.round(180000 * (1 + i * 0.05) + (Math.random() - 0.5) * 15000),
  arr:  Math.round(2160000 * (1 + i * 0.05) + (Math.random() - 0.5) * 180000),
  churn: Math.round(rand(3, 12) * 1000),
}))

export const planDistribution = [
  { name: 'Enterprise', value: 4,  fill: '#F59E0B' },
  { name: 'Business',   value: 7,  fill: '#8B5CF6' },
  { name: 'Growth',     value: 9,  fill: '#3B82F6' },
  { name: 'Starter',    value: 5,  fill: '#6B7280' },
]

export const userActivityHeatmap = Array.from({ length: 7 }, (_, day) =>
  Array.from({ length: 24 }, (_, hour) => ({
    day, hour,
    value: (hour >= 8 && hour <= 20) ? rand(20, 100) : rand(0, 20),
  }))
).flat()

export const apiCallsTimeline = generateDailySeries(30, 85000, 20000)
export const activeUsersTimeline = generateDailySeries(30, 3200, 800)

// ─── Billing Data ──────────────────────────────────────────────────────────
export const invoices = Array.from({ length: 40 }, (_, i) => ({
  id: `inv_${String(i + 1).padStart(6, '0')}`,
  tenant: tenants[i % tenants.length].name,
  tenant_id: tenants[i % tenants.length].id,
  amount: rand(49, 2999),
  status: i % 10 === 0 ? 'failed' : i % 8 === 0 ? 'pending' : 'paid',
  plan: Object.values(PLANS)[i % 4].label,
  date: subDays(new Date(), rand(1, 90)).toISOString(),
  period_start: subDays(new Date(), rand(31, 60)).toISOString(),
  period_end: subDays(new Date(), rand(1, 30)).toISOString(),
}))

export const revenueByPlan = [
  { plan: 'Enterprise', revenue: 119880, tenants: 4  },
  { plan: 'Business',   revenue: 85512,  tenants: 7  },
  { plan: 'Growth',     revenue: 56412,  tenants: 9  },
  { plan: 'Starter',    revenue: 17640,  tenants: 5  },
]

export const churnData = generateMonthlySeries(6, 3, 1)
export const failedPaymentsData = generateMonthlySeries(6, 5, 2)

// ─── Security Events ───────────────────────────────────────────────────────
const securityTypes = ['Failed Login', 'Brute Force', 'Suspicious IP', 'API Abuse', 'Permission Escalation', 'Token Leak', 'Unusual Access', 'MFA Bypass Attempt']
const severities    = ['critical', 'high', 'medium', 'low']

export const securityEvents = Array.from({ length: 50 }, (_, i) => ({
  id: `evt_${String(i + 1).padStart(6, '0')}`,
  type: securityTypes[i % securityTypes.length],
  severity: severities[i % 4],
  user: users[i % users.length].email,
  tenant: tenants[i % tenants.length].name,
  ip: `${rand(10,200)}.${rand(1,255)}.${rand(1,255)}.${rand(1,255)}`,
  country: ['US', 'CN', 'RU', 'DE', 'BR', 'IN'][i % 6],
  timestamp: subDays(new Date(), rand(0, 7)).toISOString(),
  resolved: i % 3 === 0,
  details: `Detected ${securityTypes[i % securityTypes.length].toLowerCase()} from suspicious source`,
}))

export const securityMetrics = {
  failedLogins: 847,
  failedLoginsChange: +23,
  lockedAccounts: 12,
  mfaAdoption: 73.4,
  suspiciousEvents: 34,
  blockedIPs: 218,
  vulnerabilities: 3,
  complianceScore: 94,
}

// ─── Audit Logs ────────────────────────────────────────────────────────────
const auditActions = [
  'tenant.created', 'tenant.suspended', 'tenant.plan_changed',
  'user.created', 'user.deleted', 'user.role_changed', 'user.locked',
  'billing.invoice_paid', 'billing.refund_issued', 'billing.plan_upgraded',
  'security.policy_changed', 'security.ip_blocked', 'security.mfa_enforced',
  'system.config_updated', 'system.maintenance_started', 'report.exported',
  'api_key.created', 'api_key.revoked', 'webhook.created', 'integration.enabled',
]

export const auditLogs = Array.from({ length: 100 }, (_, i) => {
  const action  = auditActions[i % auditActions.length]
  const [resource, verb] = action.split('.')
  const admin = users[i % 5]
  return {
    id: `log_${String(i + 1).padStart(7, '0')}`,
    action,
    resource,
    verb,
    actor: admin.email,
    actor_role: admin.role,
    target_id: `${resource}_${String(rand(1, 999)).padStart(4, '0')}`,
    tenant: tenants[i % tenants.length].name,
    ip_address: `${rand(10,200)}.${rand(1,255)}.${rand(1,255)}.${rand(1,255)}`,
    timestamp: subDays(new Date(), rand(0, 30)).toISOString(),
    before: { status: 'active', plan: 'growth' },
    after: { status: verb.includes('suspend') ? 'suspended' : 'active', plan: 'business' },
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    session_id: `sess_${String(rand(100000, 999999))}`,
  }
})

// ─── Notifications ─────────────────────────────────────────────────────────
const notifTypes = ['billing', 'security', 'system', 'tenant', 'support', 'report']
const notifTitles = {
  billing:  ['Payment Failed', 'Invoice Generated', 'Subscription Upgraded', 'Trial Ending Soon'],
  security: ['Suspicious Activity Detected', 'Multiple Failed Logins', 'New IP Access', 'API Key Exposed'],
  system:   ['System Update Available', 'High CPU Alert', 'Queue Backlog Warning', 'Maintenance Scheduled'],
  tenant:   ['New Tenant Registered', 'Tenant Suspended', 'Storage Limit Approaching', 'Plan Downgrade'],
  support:  ['New Support Ticket', 'SLA Breach Warning', 'Ticket Escalated', 'Customer Feedback'],
  report:   ['Weekly Report Generated', 'Export Completed', 'Report Scheduled', 'Template Updated'],
}

export const notificationsList = Array.from({ length: 35 }, (_, i) => {
  const type = notifTypes[i % notifTypes.length]
  const titles = notifTitles[type]
  return {
    id: `notif_${String(i + 1).padStart(5, '0')}`,
    type,
    title: titles[i % titles.length],
    message: `Details for ${titles[i % titles.length].toLowerCase()} affecting ${tenants[i % tenants.length].name}.`,
    severity: ['critical', 'warning', 'info', 'success'][i % 4],
    read: i > 12,
    timestamp: subDays(new Date(), rand(0, 14)).toISOString(),
    tenant: tenants[i % tenants.length].name,
  }
})

// ─── Support Tickets ───────────────────────────────────────────────────────
const ticketSubjects = [
  'Unable to export reports', 'SSO integration broken', 'Billing discrepancy',
  'API rate limit too low', 'User provisioning failed', 'Data export missing fields',
  'Dashboard loading slowly', 'Webhook not triggering', 'MFA reset request',
  'Custom domain not resolving', 'SAML configuration help', 'Bulk import errors',
]

export const supportTickets = Array.from({ length: 30 }, (_, i) => ({
  id: `TKT-${String(10000 + i + 1)}`,
  subject: ticketSubjects[i % ticketSubjects.length],
  tenant: tenants[i % tenants.length].name,
  requester: users[i % users.length].email,
  priority: ['critical', 'high', 'medium', 'low'][i % 4],
  status: ['open', 'in_progress', 'waiting', 'resolved', 'closed'][i % 5],
  assignee: ['Sarah K.', 'Mike R.', 'Dana L.', 'Tom B.', null][i % 5],
  created_at: subDays(new Date(), rand(0, 30)).toISOString(),
  updated_at: subDays(new Date(), rand(0, 7)).toISOString(),
  sla_deadline: subDays(new Date(), rand(-3, 2)).toISOString(),
  tags: ['billing', 'technical', 'access', 'integration', 'performance'].slice(0, rand(1, 3)),
  messages: rand(1, 12),
}))

// ─── Webhook Logs ─────────────────────────────────────────────────────────
export const webhookLogs = Array.from({ length: 30 }, (_, i) => ({
  id: `wh_${String(i + 1).padStart(7, '0')}`,
  event: ['tenant.created', 'payment.succeeded', 'user.created', 'report.submitted', 'subscription.updated'][i % 5],
  endpoint: `https://hooks.${tenants[i % tenants.length].slug}.io/dsr`,
  status: i % 8 === 0 ? 'failed' : 'delivered',
  status_code: i % 8 === 0 ? 500 : 200,
  duration_ms: rand(50, 2000),
  timestamp: subDays(new Date(), rand(0, 7)).toISOString(),
  payload_size: rand(256, 4096),
  retries: i % 8 === 0 ? rand(1, 3) : 0,
}))

// ─── System Config ─────────────────────────────────────────────────────────
export const systemConfig = {
  general: {
    platform_name: 'DSR Admin Portal',
    support_email: 'support@dsrplatform.io',
    max_tenants: 10000,
    maintenance_mode: false,
    registration_open: true,
  },
  email: {
    provider: 'SendGrid',
    from_name: 'DSR Platform',
    from_email: 'noreply@dsrplatform.io',
    smtp_host: 'smtp.sendgrid.net',
    smtp_port: 587,
  },
  security: {
    session_timeout_minutes: 60,
    max_login_attempts: 5,
    lockout_duration_minutes: 30,
    require_mfa: false,
    ip_whitelist_enabled: false,
    password_min_length: 12,
    password_require_special: true,
  },
  storage: {
    provider: 'AWS S3',
    bucket: 'dsr-platform-prod',
    region: 'us-east-1',
    max_upload_mb: 100,
  },
  features: {
    ai_reporting: true,
    advanced_analytics: true,
    custom_domains: false,
    sso_saml: true,
    api_access: true,
    white_labeling: false,
    bulk_export: true,
    workflow_automation: false,
  },
}

// ─── Team Members (Admin users) ────────────────────────────────────────────
export const teamMembers = [
  { id: 'adm_001', name: 'Victor Reyes',    email: 'victor@dsrplatform.io',   role: 'Super Admin',    status: 'active', last_active: subDays(new Date(), 0).toISOString(),  mfa: true,  avatar_color: '#3B82F6' },
  { id: 'adm_002', name: 'Priya Sharma',    email: 'priya@dsrplatform.io',    role: 'Billing Admin',  status: 'active', last_active: subDays(new Date(), 1).toISOString(),  mfa: true,  avatar_color: '#10B981' },
  { id: 'adm_003', name: 'Marcus Chen',     email: 'marcus@dsrplatform.io',   role: 'Security Admin', status: 'active', last_active: subDays(new Date(), 0).toISOString(),  mfa: true,  avatar_color: '#8B5CF6' },
  { id: 'adm_004', name: 'Elena Kovacs',    email: 'elena@dsrplatform.io',    role: 'Support Admin',  status: 'active', last_active: subDays(new Date(), 2).toISOString(),  mfa: false, avatar_color: '#F59E0B' },
  { id: 'adm_005', name: 'James Nakamura',  email: 'james@dsrplatform.io',    role: 'Read-only Admin',status: 'active', last_active: subDays(new Date(), 5).toISOString(),  mfa: true,  avatar_color: '#06B6D4' },
  { id: 'adm_006', name: 'Aisha Okonkwo',  email: 'aisha@dsrplatform.io',    role: 'Support Admin',  status: 'inactive', last_active: subDays(new Date(), 18).toISOString(), mfa: false, avatar_color: '#EF4444' },
  { id: 'adm_007', name: 'Raj Patel',      email: 'raj@dsrplatform.io',      role: 'Billing Admin',  status: 'active', last_active: subDays(new Date(), 1).toISOString(),  mfa: true,  avatar_color: '#F97316' },
]

// ─── Integrations ─────────────────────────────────────────────────────────
export const integrations = [
  { id: 'int_001', name: 'Slack',       category: 'Communication', status: 'connected', icon: '💬', description: 'Send alerts and reports to Slack channels', tenants_using: 18 },
  { id: 'int_002', name: 'Stripe',      category: 'Billing',       status: 'connected', icon: '💳', description: 'Payment processing and subscription management', tenants_using: 25 },
  { id: 'int_003', name: 'Datadog',     category: 'Monitoring',    status: 'connected', icon: '📊', description: 'Infrastructure metrics and APM', tenants_using: 8 },
  { id: 'int_004', name: 'Okta',        category: 'Auth',          status: 'connected', icon: '🔐', description: 'SSO and identity management', tenants_using: 12 },
  { id: 'int_005', name: 'SendGrid',    category: 'Email',         status: 'connected', icon: '📧', description: 'Transactional email delivery', tenants_using: 25 },
  { id: 'int_006', name: 'PagerDuty',   category: 'Alerting',      status: 'disconnected', icon: '🚨', description: 'On-call incident management', tenants_using: 5 },
  { id: 'int_007', name: 'Jira',        category: 'Project Mgmt',  status: 'disconnected', icon: '📋', description: 'Issue tracking and project management', tenants_using: 0 },
  { id: 'int_008', name: 'GitHub',      category: 'Developer',     status: 'connected', icon: '🐙', description: 'Source control and CI/CD webhooks', tenants_using: 15 },
  { id: 'int_009', name: 'Salesforce',  category: 'CRM',           status: 'disconnected', icon: '☁️', description: 'CRM sync and lead management', tenants_using: 0 },
  { id: 'int_010', name: 'Intercom',    category: 'Support',       status: 'connected', icon: '💬', description: 'Customer messaging and support chat', tenants_using: 20 },
]

// ─── Report Templates ──────────────────────────────────────────────────────
export const reportTemplates = [
  { id: 'rpt_001', name: 'Weekly Activity Summary',   type: 'scheduled', last_run: subDays(new Date(), 2).toISOString(),  schedule: 'Every Monday 9:00 AM' },
  { id: 'rpt_002', name: 'Monthly Revenue Report',    type: 'scheduled', last_run: subDays(new Date(), 15).toISOString(), schedule: 'First day of month' },
  { id: 'rpt_003', name: 'Tenant Health Dashboard',   type: 'manual',    last_run: subDays(new Date(), 5).toISOString(),  schedule: null },
  { id: 'rpt_004', name: 'Security Audit Export',     type: 'scheduled', last_run: subDays(new Date(), 7).toISOString(),  schedule: 'Every Sunday 2:00 AM' },
  { id: 'rpt_005', name: 'User Adoption Metrics',     type: 'manual',    last_run: subDays(new Date(), 1).toISOString(),  schedule: null },
  { id: 'rpt_006', name: 'Failed Payments Summary',   type: 'scheduled', last_run: subDays(new Date(), 3).toISOString(),  schedule: 'Daily at 8:00 AM' },
]

// ─── Workflow Automations ──────────────────────────────────────────────────
export const automations = [
  { id: 'auto_001', name: 'Auto-suspend on payment failure',  trigger: 'billing.payment_failed', actions: 3, status: 'active', runs: 847, last_run: subDays(new Date(), 1).toISOString() },
  { id: 'auto_002', name: 'Notify on trial expiry',           trigger: 'tenant.trial_expiring',  actions: 2, status: 'active', runs: 234, last_run: subDays(new Date(), 2).toISOString() },
  { id: 'auto_003', name: 'Alert on brute force detection',   trigger: 'security.brute_force',   actions: 4, status: 'active', runs: 56,  last_run: subDays(new Date(), 0).toISOString() },
  { id: 'auto_004', name: 'Weekly digest email',              trigger: 'schedule.weekly',        actions: 1, status: 'active', runs: 52,  last_run: subDays(new Date(), 6).toISOString() },
  { id: 'auto_005', name: 'Storage warning notification',     trigger: 'tenant.storage_85pct',   actions: 2, status: 'paused', runs: 128, last_run: subDays(new Date(), 3).toISOString() },
]

export default {
  tenants, users, invoices, revenueData, planDistribution,
  dashboardKPIs, realtimeMetrics, tenantGrowthData,
  userActivityHeatmap, apiCallsTimeline, activeUsersTimeline,
  revenueByPlan, churnData, failedPaymentsData,
  securityEvents, securityMetrics,
  auditLogs, notificationsList, supportTickets,
  webhookLogs, systemConfig, teamMembers, integrations,
  reportTemplates, automations, PLANS,
}
