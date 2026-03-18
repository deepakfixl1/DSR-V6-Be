import { useState } from 'react'
import { Code2, Key, Webhook, Copy, RefreshCw, Eye, EyeOff, Plus, CheckCircle, Clock, Download, ExternalLink, AlertCircle, RotateCcw } from 'lucide-react'
import { webhookLogs } from '../data/mockData'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { StatusBadge } from '../components/ui/Badge'
import { AdminAreaChart } from '../components/charts/ChartWidgets'
import { useApp } from '../context/AppContext'
import { apiCallsTimeline } from '../data/mockData'
import { format } from 'date-fns'
import clsx from 'clsx'

const ENDPOINTS = [
  { method: 'GET',    path: '/api/v1/tenants',          description: 'List all tenants' },
  { method: 'POST',   path: '/api/v1/tenants',          description: 'Create tenant' },
  { method: 'GET',    path: '/api/v1/tenants/{id}',     description: 'Get tenant by ID' },
  { method: 'PATCH',  path: '/api/v1/tenants/{id}',     description: 'Update tenant' },
  { method: 'DELETE', path: '/api/v1/tenants/{id}',     description: 'Delete tenant' },
  { method: 'GET',    path: '/api/v1/users',            description: 'List all users' },
  { method: 'POST',   path: '/api/v1/users/invite',     description: 'Invite user' },
  { method: 'GET',    path: '/api/v1/reports',          description: 'List reports' },
  { method: 'POST',   path: '/api/v1/reports/export',   description: 'Export report' },
  { method: 'GET',    path: '/api/v1/audit-logs',       description: 'Get audit logs' },
  { method: 'GET',    path: '/api/v1/billing/invoices', description: 'List invoices' },
  { method: 'POST',   path: '/api/v1/billing/refund',   description: 'Issue refund' },
]

const METHOD_COLORS = { GET: 'text-green-400 bg-green-500/10', POST: 'text-blue-400 bg-blue-500/10', PATCH: 'text-amber-400 bg-amber-500/10', DELETE: 'text-red-400 bg-red-500/10' }

export default function DevTools() {
  const { addToast } = useApp()
  const [tab, setTab] = useState('API Docs')
  const [showKey, setShowKey] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [expandedEndpoint, setExpandedEndpoint] = useState(null)

  const apiKey = 'sk_admin_X8k2mP9nQrLvYz4hJdWbCsAeUoTiFgN'
  const maskedKey = showKey ? apiKey : 'sk_admin_' + '•'.repeat(24)

  const copy = (text) => { navigator.clipboard?.writeText(text); addToast('Copied!', 'success') }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex gap-0">
          {['API Docs', 'API Keys', 'Webhooks', 'Usage'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={clsx('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors', tab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'API Docs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Endpoint List */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-100">REST API Endpoints</h3>
              <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 px-2 py-1 rounded font-mono">v1.4.2</span>
            </div>
            {ENDPOINTS.map((ep, i) => (
              <div key={i} className="admin-card overflow-hidden">
                <button
                  onClick={() => setExpandedEndpoint(expandedEndpoint === i ? null : i)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-700/30 transition-colors"
                >
                  <span className={clsx('text-xs font-bold px-2 py-0.5 rounded font-mono w-16 text-center shrink-0', METHOD_COLORS[ep.method])}>
                    {ep.method}
                  </span>
                  <span className="font-mono text-sm text-gray-300 flex-1">{ep.path}</span>
                  <span className="text-xs text-gray-500">{ep.description}</span>
                </button>
                {expandedEndpoint === i && (
                  <div className="px-4 pb-4 border-t border-gray-700 pt-3">
                    <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-gray-300">
                      <div className="text-gray-500 mb-2"># Example request</div>
                      <div><span className="text-blue-400">curl</span> -X {ep.method} \</div>
                      <div className="ml-2">https://api.dsrplatform.io{ep.path} \</div>
                      <div className="ml-2"><span className="text-amber-400">-H</span> "Authorization: Bearer sk_admin_..." \</div>
                      <div className="ml-2"><span className="text-amber-400">-H</span> "Content-Type: application/json"</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Reference */}
          <div className="space-y-4">
            <Card title="Base URL">
              <div className="flex items-center gap-2 bg-gray-900 rounded px-3 py-2">
                <code className="font-mono text-xs text-green-400 flex-1">https://api.dsrplatform.io</code>
                <button onClick={() => copy('https://api.dsrplatform.io')} className="text-gray-500 hover:text-gray-300"><Copy size={12} /></button>
              </div>
            </Card>
            <Card title="Authentication">
              <p className="text-xs text-gray-400 leading-relaxed">All API requests must include a valid API key in the Authorization header using Bearer token authentication.</p>
              <div className="mt-3 bg-gray-900 rounded p-3 font-mono text-xs text-amber-400">
                Authorization: Bearer sk_admin_...
              </div>
            </Card>
            <Card title="Rate Limits">
              <div className="space-y-2 text-xs">
                {[['Standard', '1,000/min'], ['Enterprise', '10,000/min'], ['Admin', 'Unlimited']].map(([tier, limit]) => (
                  <div key={tier} className="flex justify-between border-b border-gray-700/40 pb-1.5 last:border-0">
                    <span className="text-gray-400">{tier}</span>
                    <span className="text-gray-200 font-semibold font-mono">{limit}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'API Keys' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-100">Platform API Keys</h3>
            <Button size="sm" icon={Plus} onClick={() => addToast('New API key created', 'success')}>Generate Key</Button>
          </div>

          {/* Current key */}
          <Card title="Admin API Key">
            <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2.5 border border-gray-700 mb-3">
              <code className="font-mono text-sm flex-1 text-gray-300">{maskedKey}</code>
              <button onClick={() => setShowKey(v => !v)} className="text-gray-500 hover:text-gray-300 p-1">{showKey ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              <button onClick={() => copy(apiKey)} className="text-gray-500 hover:text-gray-300 p-1"><Copy size={14} /></button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" icon={RefreshCw} onClick={() => addToast('API key rotated. Previous key invalidated in 24h.', 'warning')}>Rotate Key</Button>
              <Button size="sm" variant="danger" onClick={() => addToast('API key revoked', 'error')}>Revoke</Button>
            </div>
          </Card>

          {/* Key list */}
          <Card noPad>
            <div className="px-5 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-100">All API Keys</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Key</th><th>Created</th><th>Last Used</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {[
                  { name: 'Admin Portal',     key: 'sk_admin_X8k2...', created: '30 days ago', last: '2 min ago',  active: true },
                  { name: 'Monitoring Hook',  key: 'sk_hook_P2m9...',  created: '90 days ago', last: '5 min ago',  active: true },
                  { name: 'Export Service',   key: 'sk_svc_L4n7...',   created: '60 days ago', last: '1 hr ago',   active: true },
                  { name: 'Legacy Key',       key: 'sk_old_B1j3...',   created: '1 year ago',  last: '45 days ago',active: false },
                ].map((k, i) => (
                  <tr key={i}>
                    <td className="font-medium text-gray-200">{k.name}</td>
                    <td><code className="font-mono text-xs text-gray-400">{k.key}</code></td>
                    <td className="text-xs text-gray-500">{k.created}</td>
                    <td className="text-xs text-gray-500">{k.last}</td>
                    <td><StatusBadge status={k.active ? 'active' : 'inactive'} /></td>
                    <td>
                      <Button size="xs" variant="danger" onClick={() => addToast(`Key "${k.name}" revoked`, 'warning')}>Revoke</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {tab === 'Webhooks' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-100">Webhook Logs</h3>
            <Button size="sm" icon={Plus} onClick={() => addToast('Add webhook endpoint', 'info')}>Add Endpoint</Button>
          </div>
          <Card noPad>
            <table className="data-table">
              <thead>
                <tr><th>Event</th><th>Endpoint</th><th>Status</th><th>Duration</th><th>Timestamp</th><th /></tr>
              </thead>
              <tbody>
                {webhookLogs.map(log => (
                  <tr key={log.id} className={log.status === 'failed' ? 'bg-red-500/5' : ''}>
                    <td><code className="text-xs font-mono text-violet-400">{log.event}</code></td>
                    <td><span className="text-xs text-gray-400 truncate max-w-48 block">{log.endpoint}</span></td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={log.status} />
                        <span className={clsx('text-xs font-mono', log.status_code === 200 ? 'text-green-400' : 'text-red-400')}>{log.status_code}</span>
                      </div>
                    </td>
                    <td><span className={clsx('text-xs font-mono', log.duration_ms > 1000 ? 'text-amber-400' : 'text-gray-300')}>{log.duration_ms}ms</span></td>
                    <td><span className="text-xs text-gray-500">{format(new Date(log.timestamp), 'MMM d, HH:mm')}</span></td>
                    <td>
                      <div className="flex gap-1">
                        {log.status === 'failed' && (
                          <Button size="xs" variant="outline" icon={RotateCcw} onClick={() => addToast('Retrying webhook...', 'info')}>Retry</Button>
                        )}
                        <Button size="xs" variant="ghost" icon={Eye} onClick={() => setSelectedLog(log)}>View</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {tab === 'Usage' && (
        <div className="space-y-5">
          <Card noPad>
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-sm font-semibold text-gray-100">API Throughput (30 days)</h3>
            </div>
            <AdminAreaChart data={apiCallsTimeline} dataKey="api" label="API Calls" color="#8B5CF6" height={220} />
          </Card>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Calls (30d)', value: '2.4M',  color: 'text-blue-400' },
              { label: 'Avg Response Time', value: '187ms', color: 'text-green-400' },
              { label: 'Error Rate',        value: '0.04%', color: 'text-red-400' },
              { label: 'Active API Keys',   value: '312',   color: 'text-violet-400' },
            ].map(s => (
              <div key={s.label} className="admin-card px-4 py-3">
                <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                <div className={clsx('text-xl font-bold', s.color)}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
