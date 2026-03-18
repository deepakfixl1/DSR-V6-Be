import { useState, useMemo } from 'react'
import { Search, Download, Filter, Calendar, ChevronRight, Eye, RefreshCw, FileText } from 'lucide-react'
import { auditLogs } from '../data/mockData'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { format } from 'date-fns'
import clsx from 'clsx'

const ACTION_COLORS = {
  tenant: 'text-blue-400', user: 'text-violet-400', billing: 'text-green-400',
  security: 'text-red-400', system: 'text-amber-400', api_key: 'text-cyan-400',
  webhook: 'text-orange-400', integration: 'text-pink-400', report: 'text-teal-400',
}

export default function AuditLogs() {
  const [search, setSearch]         = useState('')
  const [resourceFilter, setResource] = useState('all')
  const [dateRange, setDateRange]   = useState('all')
  const [selectedLog, setSelectedLog] = useState(null)
  const [page, setPage]             = useState(1)
  const PER_PAGE = 15

  const resources = [...new Set(auditLogs.map(l => l.resource))]

  const filtered = useMemo(() => {
    let list = [...auditLogs]
    if (search) list = list.filter(l =>
      l.action.includes(search.toLowerCase()) ||
      l.actor.includes(search.toLowerCase()) ||
      l.tenant.toLowerCase().includes(search.toLowerCase())
    )
    if (resourceFilter !== 'all') list = list.filter(l => l.resource === resourceFilter)
    if (dateRange === '24h') list = list.filter(l => new Date(l.timestamp) > new Date(Date.now() - 86400000))
    if (dateRange === '7d')  list = list.filter(l => new Date(l.timestamp) > new Date(Date.now() - 604800000))
    return list
  }, [search, resourceFilter, dateRange])

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="admin-input pl-9" placeholder="Search action, actor, tenant..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="admin-select w-40" value={resourceFilter} onChange={e => { setResource(e.target.value); setPage(1) }}>
          <option value="all">All Resources</option>
          {resources.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-md p-1">
          {[['all', 'All Time'], ['24h', '24h'], ['7d', '7 days'], ['30d', '30 days']].map(([val, lbl]) => (
            <button key={val} onClick={() => setDateRange(val)} className={clsx('px-2.5 py-1 text-xs rounded transition-colors', dateRange === val ? 'bg-gray-600 text-gray-100' : 'text-gray-500 hover:text-gray-300')}>
              {lbl}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" icon={Download} className="ml-auto" onClick={() => {}}>
          Export CSV
        </Button>
      </div>

      {/* Log Table */}
      <Card noPad>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-gray-100">{filtered.length} audit events</span>
          <div className="flex items-center gap-1.5 text-xs text-blue-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
            </span>
            Immutable log
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Actor</th>
                <th>Tenant</th>
                <th>Target</th>
                <th>IP Address</th>
                <th>Timestamp</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {paginated.map(log => (
                <tr key={log.id} onClick={() => setSelectedLog(log)}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className={clsx('text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-gray-700', ACTION_COLORS[log.resource] || 'text-gray-400')}>
                        {log.action}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="text-gray-200">{log.actor}</div>
                    <div className="text-xs text-gray-500">{log.actor_role}</div>
                  </td>
                  <td><span className="text-gray-300">{log.tenant}</span></td>
                  <td><span className="font-mono text-xs text-gray-500">{log.target_id}</span></td>
                  <td><span className="font-mono text-xs text-gray-500">{log.ip_address}</span></td>
                  <td>
                    <div className="text-xs text-gray-400">{format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}</div>
                    <div className="text-xs text-gray-600">{format(new Date(log.timestamp), 'yyyy')}</div>
                  </td>
                  <td>
                    <Button size="xs" variant="ghost" icon={Eye} onClick={e => { e.stopPropagation(); setSelectedLog(log) }}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-700">
          <span className="text-xs text-gray-500">Page {page} of {totalPages} · {filtered.length} results</span>
          <div className="flex items-center gap-1">
            <Button size="xs" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)} className={clsx('w-7 h-7 text-xs rounded transition-colors', n === page ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700')}>{n}</button>
            ))}
            <Button size="xs" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
          </div>
        </div>
      </Card>

      {/* Log Detail Modal */}
      {selectedLog && (
        <Modal open onClose={() => setSelectedLog(null)} title="Audit Event Detail" size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Log ID',      value: <span className="font-mono text-xs text-gray-400">{selectedLog.id}</span> },
                { label: 'Action',      value: <span className={clsx('font-mono text-xs font-medium', ACTION_COLORS[selectedLog.resource])}>{selectedLog.action}</span> },
                { label: 'Actor',       value: selectedLog.actor },
                { label: 'Actor Role',  value: selectedLog.actor_role },
                { label: 'Tenant',      value: selectedLog.tenant },
                { label: 'Target',      value: <span className="font-mono text-xs">{selectedLog.target_id}</span> },
                { label: 'IP Address',  value: <span className="font-mono text-xs">{selectedLog.ip_address}</span> },
                { label: 'Session',     value: <span className="font-mono text-xs">{selectedLog.session_id}</span> },
                { label: 'Timestamp',   value: format(new Date(selectedLog.timestamp), 'PPpp') },
                { label: 'User Agent',  value: <span className="text-xs text-gray-400 truncate block max-w-48">{selectedLog.user_agent}</span> },
              ].map(({ label, value }) => (
                <div key={label} className="border-b border-gray-700/40 pb-2">
                  <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                  <div className="text-gray-200">{value}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-2">State Change (JSON diff)</div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-red-400 mb-2 font-semibold">BEFORE</div>
                  <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap">{JSON.stringify(selectedLog.before, null, 2)}</pre>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-green-400 mb-2 font-semibold">AFTER</div>
                  <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap">{JSON.stringify(selectedLog.after, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
