import { useState, useMemo } from 'react'
import { Search, Filter, UserPlus, Download, Lock, Unlock, MoreHorizontal, CheckCircle, XCircle, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import { users } from '../data/mockData'
import { StatusBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { ConfirmModal } from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { format } from 'date-fns'
import clsx from 'clsx'

const ROLES = ['Super Admin', 'Billing Admin', 'Security Admin', 'Support Admin', 'Read-only Admin', 'Member', 'Manager', 'Analyst']

export default function Users() {
  const { addToast } = useApp()
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatus] = useState('all')
  const [sortBy, setSortBy]       = useState('created_at')
  const [sortDir, setSortDir]     = useState('desc')
  const [selected, setSelected]   = useState(new Set())
  const [confirm, setConfirm]     = useState(null)
  const [page, setPage]           = useState(1)
  const PER_PAGE = 15

  const filtered = useMemo(() => {
    let list = [...users]
    if (search) list = list.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search.toLowerCase()))
    if (roleFilter !== 'all') list = list.filter(u => u.role === roleFilter)
    if (statusFilter !== 'all') list = list.filter(u => u.status === statusFilter)
    list.sort((a, b) => {
      let av = a[sortBy], bv = b[sortBy]
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return list
  }, [search, roleFilter, statusFilter, sortBy, sortDir])

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const SortIcon = ({ col }) =>
    sortBy === col
      ? (sortDir === 'asc' ? <ChevronUp size={11} className="text-blue-400" /> : <ChevronDown size={11} className="text-blue-400" />)
      : <ChevronUp size={11} className="opacity-0 group-hover:opacity-50 text-gray-500" />

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',   value: users.length,                         color: 'text-blue-400' },
          { label: 'Active',        value: users.filter(u => u.status === 'active').length,   color: 'text-green-400' },
          { label: 'MFA Enabled',   value: users.filter(u => u.mfa_enabled).length,           color: 'text-violet-400' },
          { label: 'Locked',        value: users.filter(u => u.status === 'locked').length,   color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="admin-card px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">{s.label}</span>
            <span className={clsx('text-xl font-bold tabular-nums', s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="admin-input pl-9" placeholder="Search users..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="admin-select w-44" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="admin-select w-36" value={statusFilter} onChange={e => setStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="locked">Locked</option>
        </select>
        <div className="ml-auto flex gap-2">
          {selected.size > 0 && (
            <div className="flex items-center gap-2 border-r border-gray-700 pr-3">
              <span className="text-xs text-gray-400">{selected.size} selected</span>
              <Button size="sm" variant="danger" icon={Lock} onClick={() => setConfirm({ title: 'Lock Users', message: `Lock ${selected.size} selected users?`, danger: true, confirmLabel: 'Lock All' })}>
                Lock
              </Button>
            </div>
          )}
          <Button size="sm" variant="outline" icon={Download} onClick={() => addToast('Exporting user list...', 'info')}>Export</Button>
          <Button size="sm" icon={UserPlus} onClick={() => addToast('Invite user modal', 'info')}>Invite User</Button>
        </div>
      </div>

      {/* Table */}
      <Card noPad>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-gray-100">{filtered.length} users</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input type="checkbox"
                    checked={selected.size === paginated.length && paginated.length > 0}
                    onChange={() => selected.size === paginated.length ? setSelected(new Set()) : setSelected(new Set(paginated.map(u => u.id)))}
                    className="rounded border-gray-600 bg-gray-800 text-blue-500"
                  />
                </th>
                {['User', 'Role', 'Tenant', 'Status', 'MFA', 'Logins', 'Last Login'].map(col => (
                  <th key={col} className="group cursor-pointer hover:text-gray-200 select-none" onClick={() => handleSort(col.toLowerCase().replace(' ', '_'))}>
                    <div className="flex items-center gap-1">{col} <SortIcon col={col.toLowerCase().replace(' ', '_')} /></div>
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {paginated.map(u => (
                <tr key={u.id}>
                  <td>
                    <input type="checkbox" checked={selected.has(u.id)} onChange={() => {
                      const s = new Set(selected)
                      s.has(u.id) ? s.delete(u.id) : s.add(u.id)
                      setSelected(s)
                    }} className="rounded border-gray-600 bg-gray-800 text-blue-500" />
                  </td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: u.avatar_color }}>
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-100">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="text-xs text-violet-400">{u.role}</span></td>
                  <td><span className="text-xs text-gray-400">{u.tenant_name}</span></td>
                  <td><StatusBadge status={u.status} /></td>
                  <td>
                    {u.mfa_enabled
                      ? <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={11} />On</span>
                      : <span className="text-xs text-gray-500 flex items-center gap-1"><XCircle size={11} />Off</span>}
                  </td>
                  <td><span className="text-gray-400 tabular-nums">{u.login_count}</span></td>
                  <td><span className="text-xs text-gray-400">{format(new Date(u.last_login), 'MMM d, yyyy')}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      {u.status === 'locked'
                        ? <Button size="xs" variant="ghost" icon={Unlock} onClick={() => addToast(`${u.name} unlocked.`, 'success')}>Unlock</Button>
                        : <Button size="xs" variant="ghost" icon={Lock} onClick={() => setConfirm({ title: 'Lock Account', message: `Lock account for ${u.name}?`, danger: true, confirmLabel: 'Lock', onConfirm: () => addToast(`${u.name} locked.`, 'warning') })}>Lock</Button>}
                      <Button size="xs" variant="ghost" icon={Shield} onClick={() => addToast(`MFA reset sent to ${u.email}`, 'info')}>Reset MFA</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-700">
          <span className="text-xs text-gray-500">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-1">
            <Button size="xs" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)} className={clsx('w-7 h-7 text-xs rounded transition-colors', n === page ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700')}>{n}</button>
            ))}
            <Button size="xs" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
          </div>
        </div>
      </Card>

      {confirm && (
        <ConfirmModal open onClose={() => setConfirm(null)} title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} danger={confirm.danger} onConfirm={confirm.onConfirm} />
      )}
    </div>
  )
}
