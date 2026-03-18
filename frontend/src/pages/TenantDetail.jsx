import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Globe, Users, BarChart3, Shield, FileText, Settings, Zap, Ban, ArrowUpRight, Copy, ExternalLink, CheckCircle } from 'lucide-react'
import { tenants, users, auditLogs, invoices } from '../data/mockData'
import { StatusBadge, PlanBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { ConfirmModal } from '../components/ui/Modal'
import { GaugeBar } from '../components/charts/ChartWidgets'
import { useApp } from '../context/AppContext'
import { format } from 'date-fns'
import clsx from 'clsx'

const TABS = ['Overview', 'Subscription', 'Usage', 'Members', 'Audit', 'Settings']

export default function TenantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToast } = useApp()
  const [tab, setTab] = useState('Overview')
  const [confirmSuspend, setConfirmSuspend] = useState(false)

  const tenant = tenants.find(t => t.id === id) || tenants[0]
  const tenantUsers = users.filter(u => u.tenant_id === tenant.id).slice(0, 6)
  const tenantInvoices = invoices.filter(inv => inv.tenant_id === tenant.id).slice(0, 5)
  const tenantLogs = auditLogs.filter(l => l.tenant === tenant.name).slice(0, 6)

  const copy = (text) => { navigator.clipboard?.writeText(text); addToast('Copied to clipboard', 'success') }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate('/tenants')} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm transition-colors">
        <ArrowLeft size={14} /> Back to Tenants
      </button>

      {/* Hero */}
      <div className="admin-card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gray-700 flex items-center justify-center text-2xl font-bold text-gray-200">
              {tenant.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-gray-100">{tenant.name}</h2>
                <StatusBadge status={tenant.status} />
                <PlanBadge plan={tenant.plan} />
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                  <span>{tenant.id}</span>
                  <button onClick={() => copy(tenant.id)} className="hover:text-gray-300"><Copy size={10} /></button>
                </span>
                {tenant.custom_domain && (
                  <span className="text-xs text-blue-400 flex items-center gap-1">
                    <Globe size={11} />{tenant.custom_domain}
                  </span>
                )}
                <span className="text-xs text-gray-500">Owner: {tenant.owner_email}</span>
                <span className="text-xs text-gray-500">Country: {tenant.country}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={Zap} onClick={() => addToast(`Impersonating ${tenant.name}...`, 'warning')}>
              Impersonate
            </Button>
            <Button size="sm" variant="outline" icon={ArrowUpRight}>
              Upgrade Plan
            </Button>
            <Button size="sm" variant="danger" icon={Ban} onClick={() => setConfirmSuspend(true)}>
              Suspend
            </Button>
          </div>
        </div>

        {/* Usage overview bars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6 pt-5 border-t border-gray-700">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-400">Storage</span>
              <span className="text-gray-200">{tenant.storage_used} / {tenant.storage_limit} GB</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className={clsx('h-full rounded-full', tenant.storage_used / tenant.storage_limit > 0.8 ? 'bg-red-500' : 'bg-blue-500')} style={{ width: `${(tenant.storage_used / tenant.storage_limit) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-400">API Calls</span>
              <span className="text-gray-200">{(tenant.api_calls_used / 1000).toFixed(0)}K / {(tenant.api_calls_limit / 1000).toFixed(0)}K</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className={clsx('h-full rounded-full', tenant.api_calls_used / tenant.api_calls_limit > 0.8 ? 'bg-amber-500' : 'bg-violet-500')} style={{ width: `${(tenant.api_calls_used / tenant.api_calls_limit) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-400">AI Tokens</span>
              <span className="text-gray-200">{(tenant.ai_tokens_used / 1000000).toFixed(1)}M / {(tenant.ai_tokens_limit / 1000000).toFixed(1)}M</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className={clsx('h-full rounded-full', tenant.ai_tokens_used / tenant.ai_tokens_limit > 0.8 ? 'bg-red-500' : 'bg-green-500')} style={{ width: `${(tenant.ai_tokens_used / tenant.ai_tokens_limit) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Members',         value: tenant.members,            color: 'text-blue-400' },
          { label: 'Monthly Revenue', value: `$${tenant.revenue}`,     color: 'text-green-400' },
          { label: 'Reports Submitted', value: tenant.reports_submitted, color: 'text-violet-400' },
          { label: 'MFA Enabled',     value: tenant.mfa_enabled ? 'Yes' : 'No', color: tenant.mfa_enabled ? 'text-green-400' : 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="admin-card px-4 py-3">
            <div className="text-xs text-gray-400 mb-1">{s.label}</div>
            <div className={clsx('text-lg font-bold tabular-nums', s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex gap-0">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                tab === t
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card title="Tenant Information">
            <dl className="space-y-3 text-sm">
              {[
                { label: 'Tenant ID',    value: <span className="font-mono text-xs text-gray-400">{tenant.id}</span> },
                { label: 'Slug',         value: <span className="font-mono text-xs text-blue-400">{tenant.slug}</span> },
                { label: 'Plan',         value: <PlanBadge plan={tenant.plan} /> },
                { label: 'Status',       value: <StatusBadge status={tenant.status} /> },
                { label: 'Owner',        value: tenant.owner_email },
                { label: 'Country',      value: tenant.country },
                { label: 'SSO',          value: tenant.sso_enabled ? <span className="text-green-400 flex items-center gap-1"><CheckCircle size={12} />Enabled</span> : <span className="text-gray-500">Disabled</span> },
                { label: 'Created',      value: format(new Date(tenant.created_at), 'PPP') },
                { label: 'Last Active',  value: format(new Date(tenant.last_active), 'PPP') },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between border-b border-gray-700/40 pb-2 last:border-0 last:pb-0">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="text-gray-200">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="Recent Invoices">
            <div className="space-y-2">
              {tenantInvoices.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No invoices found</p>
              ) : tenantInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-700/30 hover:bg-gray-700/60 transition-colors">
                  <div>
                    <div className="text-sm text-gray-200 font-medium">${inv.amount}</div>
                    <div className="text-xs text-gray-500 font-mono">{inv.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={inv.status} />
                    <span className="text-xs text-gray-500">{format(new Date(inv.date), 'MMM d')}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'Members' && (
        <Card noPad>
          <div className="px-5 py-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-100">{tenantUsers.length} Members</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>MFA</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {tenantUsers.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: u.avatar_color }}>
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-100">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="text-xs text-violet-400">{u.role}</span></td>
                  <td><StatusBadge status={u.status} /></td>
                  <td>
                    {u.mfa_enabled
                      ? <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={11} />On</span>
                      : <span className="text-xs text-gray-500">Off</span>}
                  </td>
                  <td><span className="text-xs text-gray-400">{format(new Date(u.last_login), 'MMM d, yyyy')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'Audit' && (
        <Card noPad>
          <div className="px-5 py-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-100">Recent Audit Events</h3>
          </div>
          <div className="divide-y divide-gray-700/40">
            {tenantLogs.map(log => (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-2" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-200 font-mono text-xs bg-gray-700 px-1.5 py-0.5 rounded">{log.action}</span>
                    <span className="text-xs text-gray-500">by {log.actor}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-500 font-mono">IP: {log.ip_address}</span>
                    <span className="text-xs text-gray-600">{format(new Date(log.timestamp), 'MMM d, HH:mm')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'Subscription' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card title="Current Plan">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-700/40 rounded-lg">
                <div>
                  <PlanBadge plan={tenant.plan} />
                  <div className="text-2xl font-bold text-gray-100 mt-2">${tenant.plan.price}<span className="text-sm text-gray-500">/mo</span></div>
                  <div className="text-xs text-gray-500 mt-1">Billed monthly · Next renewal in 18 days</div>
                </div>
                <Button variant="outline" size="sm">Change Plan</Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">Apply Coupon</Button>
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => addToast('Refund modal would open', 'info')}>Issue Refund</Button>
              </div>
            </div>
          </Card>
          <Card title="Billing History">
            {tenantInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-700/40 last:border-0 text-sm">
                <div>
                  <span className="text-gray-200">${inv.amount} – {inv.plan}</span>
                  <div className="text-xs text-gray-500 font-mono">{inv.id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={inv.status} />
                  <span className="text-xs text-gray-500">{format(new Date(inv.date), 'MMM d')}</span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === 'Usage' && (
        <Card title="Usage Breakdown">
          <div className="space-y-6">
            <GaugeBar value={tenant.storage_used} max={tenant.storage_limit} label={`Storage (${tenant.storage_used}/${tenant.storage_limit} GB)`} color="#3B82F6" suffix=" GB" />
            <GaugeBar value={Math.round(tenant.api_calls_used/10000)} max={100} label={`API Calls (${(tenant.api_calls_used/1000).toFixed(0)}K / ${(tenant.api_calls_limit/1000).toFixed(0)}K)`} color="#8B5CF6" suffix="%" />
            <GaugeBar value={Math.round(tenant.ai_tokens_used/50000)} max={100} label={`AI Tokens (${(tenant.ai_tokens_used/1000000).toFixed(1)}M / ${(tenant.ai_tokens_limit/1000000).toFixed(1)}M)`} color="#10B981" suffix="%" />
            <GaugeBar value={tenant.reports_submitted} max={500} label={`Reports Submitted (${tenant.reports_submitted})`} color="#F59E0B" suffix="" />
          </div>
        </Card>
      )}

      {tab === 'Settings' && (
        <Card title="Tenant Settings">
          <div className="space-y-4 text-sm">
            {[
              { label: 'Custom Domain',    value: tenant.custom_domain || 'Not configured' },
              { label: 'SSO / SAML',       value: tenant.sso_enabled ? 'Enabled' : 'Disabled' },
              { label: 'MFA Required',     value: tenant.mfa_enabled ? 'Enforced' : 'Optional' },
              { label: 'API Access',       value: 'Enabled' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-700/40 last:border-0">
                <span className="text-gray-400">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-200">{value}</span>
                  <Button size="xs" variant="ghost">Edit</Button>
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-gray-700">
              <Button variant="danger" size="sm" onClick={() => setConfirmSuspend(true)}>
                Suspend This Tenant
              </Button>
            </div>
          </div>
        </Card>
      )}

      <ConfirmModal
        open={confirmSuspend}
        onClose={() => setConfirmSuspend(false)}
        title="Suspend Tenant"
        message={`Are you sure you want to suspend "${tenant.name}"? This will immediately lock out all ${tenant.members} users.`}
        confirmLabel="Suspend Tenant"
        danger
        onConfirm={() => addToast(`${tenant.name} has been suspended.`, 'warning')}
      />
    </div>
  )
}
