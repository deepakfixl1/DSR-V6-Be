/**
 * Admin security service. Manages platform-level security config (policies, blocked IPs,
 * compliance) and derives security metrics from the audit log.
 */

import { SecurityConfig, AuditLog } from '#db/models/index.js'

const DEFAULT_POLICIES = [
  { key: 'session_timeout_minutes', label: 'Session Timeout', value: 60, type: 'number', unit: 'minutes' },
  { key: 'max_login_attempts', label: 'Max Login Attempts', value: 5, type: 'number', unit: 'attempts' },
  { key: 'lockout_duration_minutes', label: 'Lockout Duration', value: 30, type: 'number', unit: 'minutes' },
  { key: 'password_min_length', label: 'Password Min Length', value: 12, type: 'number', unit: 'characters' },
  { key: 'require_mfa', label: 'Require MFA', value: false, type: 'boolean' },
  { key: 'ip_whitelist_enabled', label: 'IP Whitelist', value: false, type: 'boolean' },
  { key: 'password_require_special', label: 'Require Special Chars', value: true, type: 'boolean' },
]

const DEFAULT_COMPLIANCE = {
  score: 87,
  items: [
    { key: 'soc2', item: 'SOC 2 Type II', status: true },
    { key: 'gdpr', item: 'GDPR Compliant', status: true },
    { key: 'iso27001', item: 'ISO 27001', status: false },
    { key: 'pci', item: 'PCI DSS', status: true },
    { key: 'hipaa', item: 'HIPAA', status: false },
  ],
  checklist: [
    { key: 'mfa_admins', item: 'MFA for all admins', done: true },
    { key: 'audit_90d', item: 'Audit logs retained 90d', done: true },
    { key: 'encrypt_rest', item: 'Encrypted data at rest', done: true },
    { key: 'tls13', item: 'TLS 1.3 enforced', done: true },
    { key: 'pentest', item: 'Penetration test completed', done: false },
    { key: 'training', item: 'Security training completed', done: false },
    { key: 'ir_plan', item: 'Incident response plan', done: true },
    { key: 'backup_tested', item: 'Backup tested this month', done: false },
  ],
}

async function getOrCreateConfig() {
  let cfg = await SecurityConfig.findOne({ _type: 'platform' }).lean()
  if (!cfg) {
    cfg = await SecurityConfig.create({
      _type: 'platform',
      policies: [],
      blockedIps: [],
      compliance: DEFAULT_COMPLIANCE,
    })
  }
  return cfg
}

export async function getPolicies() {
  const cfg = await getOrCreateConfig()
  const stored = Array.isArray(cfg.policies) ? cfg.policies : []
  return DEFAULT_POLICIES.map(p => {
    const s = stored.find(x => x.key === p.key)
    return s !== undefined ? { ...p, value: s.value } : p
  })
}

export async function savePolicies(policies) {
  const toStore = Array.isArray(policies)
    ? policies.map(p => ({ key: p.key, value: p.value }))
    : []
  await SecurityConfig.findOneAndUpdate(
    { _type: 'platform' },
    { $set: { policies: toStore } },
    { upsert: true, new: true }
  )
}

export async function getBlockedIps() {
  const cfg = await getOrCreateConfig()
  return cfg.blockedIps || []
}

export async function addBlockedIp({ ip, reason }) {
  const entry = {
    id: Date.now().toString(),
    ip,
    reason: reason || 'Manual block',
    blocked_at: new Date().toISOString(),
    count: 0,
  }
  await SecurityConfig.findOneAndUpdate(
    { _type: 'platform' },
    { $push: { blockedIps: entry } },
    { upsert: true, new: true }
  )
  return entry
}

export async function removeBlockedIp(id) {
  await SecurityConfig.findOneAndUpdate(
    { _type: 'platform' },
    { $pull: { blockedIps: { id } } }
  )
}

export async function getCompliance() {
  const cfg = await getOrCreateConfig()
  const stored = cfg.compliance
  if (!stored || !Array.isArray(stored.items) || stored.items.length === 0) {
    return { ...DEFAULT_COMPLIANCE }
  }
  return {
    score: typeof stored.score === 'number' ? stored.score : DEFAULT_COMPLIANCE.score,
    items: stored.items,
    checklist: Array.isArray(stored.checklist) && stored.checklist.length
      ? stored.checklist
      : DEFAULT_COMPLIANCE.checklist,
  }
}

export async function saveCompliance(data) {
  await SecurityConfig.findOneAndUpdate(
    { _type: 'platform' },
    { $set: { compliance: { score: data.score, items: data.items, checklist: data.checklist } } },
    { upsert: true, new: true }
  )
}

/**
 * Count security-relevant events from the audit log platform-wide.
 */
export async function getSecurityMetrics() {
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const [failedLogins, lockedAccounts, mfaSetups, passwordResets] = await Promise.all([
    AuditLog.countDocuments({ action: { $regex: new RegExp(escape('auth.login_failed'), 'i') } }),
    AuditLog.countDocuments({ action: { $regex: new RegExp(escape('auth.account_locked'), 'i') } }),
    AuditLog.countDocuments({ action: { $regex: new RegExp(escape('auth.mfa_setup'), 'i') } }),
    AuditLog.countDocuments({ action: { $regex: new RegExp(escape('auth.password_reset'), 'i') } }),
  ])
  return { failedLogins, lockedAccounts, mfaSetups, passwordResets }
}
