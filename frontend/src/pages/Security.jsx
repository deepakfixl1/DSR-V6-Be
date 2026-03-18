import { useState } from 'react'
import { Shield, AlertTriangle, Lock, Eye, Activity, Ban, Globe, Filter, Search, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { securityEvents, securityMetrics } from '../data/mockData'
import { StatusBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { AdminBarChart } from '../components/charts/ChartWidgets'
import { useApp } from '../context/AppContext'
import { format } from 'date-fns'
import clsx from 'clsx'

const SEVERITY_COLORS = { critical: '#EF4444', high: '#F97316', medium: '#F59E0B', low: '#6B7280' }
const SEVERITY_BG = { critical: 'bg-red-500/10 border-red-500/20', high: 'bg-orange-500/10 border-orange-500/20', medium: 'bg-amber-500/10 border-amber-500/20', low: 'bg-gray-700/40 border-gray-600/20' }

function EventRow({ event, onResolve }) {
  return (
    <div className={clsx('flex items-start gap-3 px-5 py-3 border-b border-gray-700/40 last:border-0 hover:bg-gray-700/20 transition-colors', event.resolved && 'opacity-60')}>
      <div className="mt-1 shrink-0">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[event.severity] }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-100">{event.type}</span>
          <StatusBadge status={event.severity} />
          {event.resolved && <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={10} />Resolved</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
          <span>{event.user}</span>
          <span className="font-mono">{event.ip}</span>
          <span className="flex items-center gap-1"><Globe size={10} />{event.country}</span>
          <span>{format(new Date(event.timestamp), 'MMM d, HH:mm')}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{event.details}</p>
      </div>
      {!event.resolved && (
        <div className="shrink-0 flex gap-1">
          <Button size="xs" variant="ghost" icon={CheckCircle} onClick={() => onResolve(event.id)}>Resolve</Button>
          <Button size="xs" variant="danger" icon={Ban}>Block IP</Button>
        </div>
      )}
    </div>
  )
}

export default function Security() {
  const { addToast } = useApp()
  const [events, setEvents] = useState(securityEvents)
  const [sevFilter, setSevFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('Events')

  const filtered = events.filter(e => {
    if (sevFilter !== 'all' && e.severity !== sevFilter) return false
    if (search && !e.type.toLowerCase().includes(search.toLowerCase()) && !e.user.includes(search)) return false
    return true
  })

  const handleResolve = (id) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e))
    addToast('Event marked as resolved', 'success')
  }

  const mfaAdoptionData = [
    { month: 'Jan', value: 58 }, { month: 'Feb', value: 62 }, { month: 'Mar', value: 65 },
    { month: 'Apr', value: 68 }, { month: 'May', value: 70 }, { month: 'Jun', value: 73 },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Security Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Failed Logins',     value: securityMetrics.failedLogins,    change: `+${securityMetrics.failedLoginsChange}`, color: 'text-red-400',    icon: XCircle },
          { label: 'Locked Accounts',   value: securityMetrics.lockedAccounts,  change: null,                                     color: 'text-amber-400',  icon: Lock },
          { label: 'MFA Adoption',      value: `${securityMetrics.mfaAdoption}%`, change: '+2.1%',                                color: 'text-green-400',  icon: Shield },
          { label: 'Suspicious Events', value: securityMetrics.suspiciousEvents, change: null,                                    color: 'text-orange-400', icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} className="admin-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={14} className={s.color} />
              <span className="text-xs text-gray-400">{s.label}</span>
            </div>
            <div className={clsx('text-2xl font-bold tabular-nums', s.color)}>{s.value}</div>
            {s.change && <div className="text-xs text-red-400 mt-0.5">{s.change} this week</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex gap-0">
          {['Events', 'Policies', 'Blocked IPs', 'Compliance'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={clsx('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors', tab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Events' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input className="admin-input pl-9" placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-md p-1">
              {['all', 'critical', 'high', 'medium', 'low'].map(s => (
                <button key={s} onClick={() => setSevFilter(s)} className={clsx('px-2.5 py-1 text-xs rounded transition-colors capitalize', sevFilter === s ? 'bg-gray-600 text-gray-100' : 'text-gray-500 hover:text-gray-300')}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 rounded-md ml-auto">
              <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" /></span>
              Live feed
            </div>
          </div>

          <Card noPad>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
              <span className="text-sm font-semibold text-gray-100">{filtered.length} events</span>
              <div className="flex gap-2">
                <span className="text-xs text-gray-500">{filtered.filter(e => !e.resolved).length} unresolved</span>
                <Button size="xs" variant="ghost" onClick={() => addToast('All resolved events cleared', 'success')}>Clear Resolved</Button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filtered.map(e => <EventRow key={e.id} event={e} onResolve={handleResolve} />)}
            </div>
          </Card>
        </div>
      )}

      {tab === 'Policies' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card title="Authentication Policies">
            <div className="space-y-4">
              {[
                { label: 'Session Timeout', value: '60 minutes', type: 'input' },
                { label: 'Max Login Attempts', value: '5 attempts', type: 'input' },
                { label: 'Lockout Duration', value: '30 minutes', type: 'input' },
                { label: 'Password Min Length', value: '12 characters', type: 'input' },
                { label: 'Require MFA', value: false, type: 'toggle' },
                { label: 'IP Whitelist', value: false, type: 'toggle' },
                { label: 'Require Special Chars', value: true, type: 'toggle' },
              ].map(policy => (
                <div key={policy.label} className="flex items-center justify-between py-2 border-b border-gray-700/40 last:border-0">
                  <div>
                    <div className="text-sm text-gray-200">{policy.label}</div>
                  </div>
                  {policy.type === 'toggle' ? (
                    <button
                      onClick={() => addToast(`${policy.label} policy updated`, 'success')}
                      className={clsx('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', policy.value ? 'bg-blue-600' : 'bg-gray-600')}
                    >
                      <span className={clsx('inline-block h-3 w-3 rounded-full bg-white transition-transform', policy.value ? 'translate-x-5' : 'translate-x-1')} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300 bg-gray-700 px-2 py-0.5 rounded">{policy.value}</span>
                      <Button size="xs" variant="ghost" onClick={() => addToast(`${policy.label} updated`, 'success')}>Edit</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card title="MFA Adoption Trend">
            <AdminBarChart data={mfaAdoptionData} color="#10B981" height={180} formatter={v => `${v}%`} />
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400">
              <CheckCircle size={13} className="inline mr-1.5" />
              MFA adoption increased 15.5% over the last 6 months
            </div>
          </Card>
        </div>
      )}

      {tab === 'Blocked IPs' && (
        <Card title={`${securityMetrics.blockedIPs} Blocked IPs`} action={<Button size="sm" icon={Ban} onClick={() => addToast('Add IP block rule', 'info')}>Block IP</Button>}>
          <div className="space-y-2">
            {Array.from({ length: 8 }, (_, i) => ({
              ip: `${192 + i}.168.${i}.${i + 10}`,
              reason: ['Brute force', 'SQL injection', 'Rate limit abuse', 'Tor exit node'][i % 4],
              blocked_at: new Date(Date.now() - i * 3600000 * 12).toISOString(),
              count: 50 + i * 15,
            })).map(item => (
              <div key={item.ip} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-700/60">
                <div>
                  <div className="font-mono text-sm text-gray-200">{item.ip}</div>
                  <div className="text-xs text-gray-500">{item.reason} · {item.count} attempts · {format(new Date(item.blocked_at), 'MMM d, HH:mm')}</div>
                </div>
                <Button size="xs" variant="ghost" onClick={() => addToast(`${item.ip} unblocked`, 'success')}>Unblock</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'Compliance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card title="Compliance Score">
            <div className="flex items-center justify-center py-6">
              <div className="relative">
                <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#1F2937" strokeWidth="10" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#10B981" strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 40 * (securityMetrics.complianceScore / 100)} ${2 * Math.PI * 40}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-green-400">{securityMetrics.complianceScore}%</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              {[
                { item: 'SOC 2 Type II',   status: true  },
                { item: 'GDPR Compliant',  status: true  },
                { item: 'ISO 27001',       status: false },
                { item: 'PCI DSS',         status: true  },
                { item: 'HIPAA',           status: false },
              ].map(c => (
                <div key={c.item} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-700/40 last:border-0">
                  <span className="text-gray-300">{c.item}</span>
                  {c.status
                    ? <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={12} />Compliant</span>
                    : <span className="text-xs text-gray-500 flex items-center gap-1"><XCircle size={12} />Not certified</span>}
                </div>
              ))}
            </div>
          </Card>

          <Card title="Security Checklist">
            <div className="space-y-3">
              {[
                { item: 'MFA for all admins', done: true },
                { item: 'Audit logs retained 90d', done: true },
                { item: 'Encrypted data at rest', done: true },
                { item: 'TLS 1.3 enforced', done: true },
                { item: 'Penetration test completed', done: false },
                { item: 'Security training completed', done: false },
                { item: 'Incident response plan', done: true },
                { item: 'Backup tested this month', done: false },
              ].map(c => (
                <div key={c.item} className="flex items-center gap-3">
                  {c.done
                    ? <CheckCircle size={15} className="text-green-400 shrink-0" />
                    : <div className="w-[15px] h-[15px] rounded-full border-2 border-gray-600 shrink-0" />}
                  <span className={clsx('text-sm', c.done ? 'text-gray-300' : 'text-gray-500')}>{c.item}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
