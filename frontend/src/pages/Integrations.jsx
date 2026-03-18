import { useState } from 'react'
import { Plug, Plus, Settings, ExternalLink, CheckCircle, XCircle, RefreshCw, Search } from 'lucide-react'
import { integrations } from '../data/mockData'
import { StatusBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import clsx from 'clsx'

const CATEGORIES = ['All', 'Communication', 'Billing', 'Monitoring', 'Auth', 'Email', 'Alerting', 'Developer', 'Support', 'CRM', 'Project Mgmt']

export default function Integrations() {
  const { addToast } = useApp()
  const [search, setSearch] = useState('')
  const [catFilter, setCat] = useState('All')
  const [intList, setIntList] = useState(integrations)
  const [selected, setSelected] = useState(null)

  const filtered = intList.filter(i => {
    if (catFilter !== 'All' && i.category !== catFilter) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const toggle = (id) => {
    setIntList(prev => prev.map(i =>
      i.id === id
        ? { ...i, status: i.status === 'connected' ? 'disconnected' : 'connected' }
        : i
    ))
    const integ = intList.find(i => i.id === id)
    addToast(`${integ.name} ${integ.status === 'connected' ? 'disconnected' : 'connected'}`, integ.status === 'connected' ? 'warning' : 'success')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Connected',   value: intList.filter(i => i.status === 'connected').length,    color: 'text-green-400' },
          { label: 'Available',   value: intList.length,                                           color: 'text-blue-400' },
          { label: 'Tenants Using', value: intList.filter(i => i.status === 'connected').reduce((s, i) => s + i.tenants_using, 0), color: 'text-violet-400' },
          { label: 'Webhooks',    value: 12,                                                       color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="admin-card px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">{s.label}</span>
            <span className={clsx('text-xl font-bold', s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="admin-input pl-9" placeholder="Search integrations..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)} className={clsx('px-2.5 py-1 text-xs rounded transition-colors', catFilter === c ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-500 hover:bg-gray-700 border border-gray-700')}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(integ => (
          <div key={integ.id} className="admin-card p-5 flex flex-col gap-3 hover:border-gray-600 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{integ.icon}</span>
                <div>
                  <div className="font-semibold text-gray-100">{integ.name}</div>
                  <div className="text-xs text-gray-500">{integ.category}</div>
                </div>
              </div>
              <StatusBadge status={integ.status} />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{integ.description}</p>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-xs text-gray-600">{integ.tenants_using} tenants</span>
              <div className="flex gap-1.5">
                {integ.status === 'connected' && (
                  <Button size="xs" variant="ghost" icon={Settings} onClick={() => { setSelected(integ) }}>Configure</Button>
                )}
                <Button
                  size="xs"
                  variant={integ.status === 'connected' ? 'danger' : 'primary'}
                  onClick={() => toggle(integ.id)}
                >
                  {integ.status === 'connected' ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Config Modal */}
      {selected && (
        <Modal open onClose={() => setSelected(null)} title={`${selected.name} Configuration`} size="md">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle size={14} className="text-green-400" />
              <span className="text-sm text-green-300">{selected.name} is connected and active</span>
            </div>
            {selected.name === 'Slack' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Webhook URL</label>
                  <input className="admin-input font-mono text-xs" defaultValue="https://hooks.slack.com/services/T00/B00/xxx" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Default Channel</label>
                  <input className="admin-input" defaultValue="#dsr-alerts" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Events to Send</label>
                  {['Payment Failed', 'Tenant Suspended', 'Security Alert', 'SLA Breach'].map(e => (
                    <label key={e} className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                      <input type="checkbox" defaultChecked className="rounded border-gray-600 bg-gray-800 text-blue-500" />
                      {e}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {selected.name !== 'Slack' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">API Key</label>
                  <input className="admin-input font-mono text-xs" defaultValue="••••••••••••••••••••" type="password" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Webhook Secret</label>
                  <input className="admin-input font-mono text-xs" defaultValue="whsec_••••••••" type="password" />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Cancel</Button>
              <Button size="sm" onClick={() => { addToast(`${selected.name} configuration saved`, 'success'); setSelected(null) }}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
