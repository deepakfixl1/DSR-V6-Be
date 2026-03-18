import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Plus, Download, MoreHorizontal, Building2, ChevronUp, ChevronDown, Eye, Ban, Zap, RefreshCw, UserCheck } from 'lucide-react'
import { tenants, PLANS } from '../data/mockData'
import { StatusBadge, PlanBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { ConfirmModal } from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { format } from 'date-fns'
import clsx from 'clsx'

const COLS = [
  { key: 'name',         label: 'Tenant',        sortable: true  },
  { key: 'plan',         label: 'Plan',           sortable: true  },
  { key: 'status',       label: 'Status',         sortable: true  },
  { key: 'members',      label: 'Members',        sortable: true  },
  { key: 'revenue',      label: 'Revenue',        sortable: true  },
  { key: 'created_at',   label: 'Created',        sortable: true  },
  { key: 'last_active',  label: 'Last Active',    sortable: true  },
  { key: 'actions',      label: '',               sortable: false },
]

function SortIcon({ col, sortBy, sortDir }) {
  if (sortBy !== col) return <ChevronUp size={11} className="text-gray-600 opacity-0 group-hover:opacity-100" />
  return sortDir === 'asc'
    ? <ChevronUp  size={11} className="text-blue-400" />
    : <ChevronDown size={11} className="text-blue-400" />
}

function RowMenu({ tenant, onAction }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-7 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-dropdown z-20 overflow-hidden py-1">
          {[
            { icon: Eye,      label: 'View Details',   action: 'view',      cls: '' },
            { icon: Zap,      label: 'Impersonate',    action: 'impersonate',cls: 'text-amber-400' },
            { icon: UserCheck,label: 'Upgrade Plan',   action: 'upgrade',   cls: 'text-blue-400' },
            { icon: Ban,      label: 'Suspend',        action: 'suspend',   cls: 'text-red-400' },
          ].map(({ icon: Icon, label, action, cls }) => (
            <button
              key={action}
              onClick={() => { setOpen(false); onAction(action, tenant) }}
              className={clsx('flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-300 hover:bg-gray-700/60 transition-colors', cls)}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Tenants() {
  const navigate = useNavigate()
  const { addToast } = useApp()

  const [search, setSearch]         = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatus]   = useState('all')
  const [sortBy, setSortBy]         = useState('created_at')
  const [sortDir, setSortDir]       = useState('desc')
  const [selected, setSelected]     = useState(new Set())
  const [confirm, setConfirm]       = useState(null)
  const [page, setPage]             = useState(1)
  const PER_PAGE = 12

  const filtered = useMemo(() => {
    let list = [...tenants]
    if (search) list = list.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.includes(search.toLowerCase()))
    if (planFilter !== 'all') list = list.filter(t => t.plan.id === planFilter)
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter)
    list.sort((a, b) => {
      let av = a[sortBy], bv = b[sortBy]
      if (sortBy === 'plan') { av = a.plan.price; bv = b.plan.price }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return list
  }, [search, planFilter, statusFilter, sortBy, sortDir])

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const toggleSelect = (id) => {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const toggleAll = () => {
    if (selected.size === paginated.length) setSelected(new Set())
    else setSelected(new Set(paginated.map(t => t.id)))
  }

  const handleAction = (action, tenant) => {
    if (action === 'view') { navigate(`/tenants/${tenant.id}`); return }
    if (action === 'suspend') {
      setConfirm({
        title: 'Suspend Tenant',
        message: `Are you sure you want to suspend "${tenant.name}"? This will immediately revoke access for all their users.`,
        onConfirm: () => addToast(`${tenant.name} has been suspended.`, 'warning'),
        danger: true,
        confirmLabel: 'Suspend Tenant',
      })
      return
    }
    if (action === 'impersonate') {
      addToast(`Impersonating ${tenant.name} workspace...`, 'info')
      return
    }
    addToast(`Action "${action}" triggered for ${tenant.name}`, 'success')
  }

  const statusCounts = {
    all: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    trial: tenants.filter(t => t.status === 'trial').length,
    suspended: tenants.filter(t => t.status === 'suspended').length,
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Tenants',   value: tenants.length, color: 'text-blue-400' },
          { label: 'Active',          value: statusCounts.active, color: 'text-green-400' },
          { label: 'Trial',           value: statusCounts.trial, color: 'text-amber-400' },
          { label: 'Suspended',       value: statusCounts.suspended, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="admin-card px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">{s.label}</span>
            <span className={clsx('text-xl font-bold tabular-nums', s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters + Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="admin-input pl-9"
            placeholder="Search tenants..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select className="admin-select w-36" value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1) }}>
          <option value="all">All Plans</option>
          {Object.values(PLANS).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select className="admin-select w-36" value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <div className="flex items-center gap-2 border-r border-gray-700 pr-3">
              <span className="text-xs text-gray-400">{selected.size} selected</span>
              <Button size="sm" variant="danger" onClick={() => setConfirm({ title: 'Bulk Suspend', message: `Suspend ${selected.size} tenants?`, danger: true, confirmLabel: 'Suspend All' })}>
                Suspend All
              </Button>
            </div>
          )}
          <Button size="sm" variant="outline" icon={Download} onClick={() => addToast('Exporting tenant data...', 'info')}>
            Export
          </Button>
          <Button size="sm" icon={Plus} onClick={() => addToast('Add tenant modal coming soon', 'info')}>
            Add Tenant
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card noPad>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-gray-100">
            {filtered.length} tenant{filtered.length !== 1 ? 's' : ''}
            {(search || planFilter !== 'all' || statusFilter !== 'all') && (
              <span className="text-gray-500 font-normal"> (filtered)</span>
            )}
          </span>
          <Button size="xs" variant="ghost" icon={RefreshCw}>Sync</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === paginated.length && paginated.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-600 bg-gray-800 text-blue-500"
                  />
                </th>
                {COLS.map(col => (
                  <th
                    key={col.key}
                    className={clsx('group', col.sortable && 'cursor-pointer hover:text-gray-200 select-none')}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && <SortIcon col={col.key} sortBy={sortBy} sortDir={sortDir} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(t => (
                <tr key={t.id} onClick={() => navigate(`/tenants/${t.id}`)}>
                  <td onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggleSelect(t.id)}
                      className="rounded border-gray-600 bg-gray-800 text-blue-500"
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-100">{t.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{t.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td><PlanBadge plan={t.plan} /></td>
                  <td><StatusBadge status={t.status} /></td>
                  <td><span className="text-gray-300">{t.members.toLocaleString()}</span></td>
                  <td><span className="text-green-400 font-semibold">${t.revenue}/mo</span></td>
                  <td><span className="text-gray-400 text-xs">{format(new Date(t.created_at), 'MMM d, yyyy')}</span></td>
                  <td>
                    <span className={clsx('text-xs', new Date(t.last_active) > new Date(Date.now() - 86400000 * 3) ? 'text-green-400' : 'text-gray-500')}>
                      {format(new Date(t.last_active), 'MMM d')}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <RowMenu tenant={t} onAction={handleAction} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-700">
          <span className="text-xs text-gray-500">
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button size="xs" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={clsx('w-7 h-7 text-xs rounded transition-colors', n === page ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700')}
              >
                {n}
              </button>
            ))}
            <Button size="xs" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
          </div>
        </div>
      </Card>

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          open
          onClose={() => setConfirm(null)}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  )
}
