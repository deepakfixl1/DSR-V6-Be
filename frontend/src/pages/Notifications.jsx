import { useState } from 'react'
import { Bell, Filter, CheckCheck, Trash2, AlertCircle, AlertTriangle, Info, CheckCircle, CreditCard, Shield, Settings, Building2, HelpCircle, BarChart3 } from 'lucide-react'
import { notificationsList } from '../data/mockData'
import { StatusBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { useApp } from '../context/AppContext'
import { format, formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const TYPE_ICONS = {
  billing:  CreditCard,
  security: Shield,
  system:   Settings,
  tenant:   Building2,
  support:  HelpCircle,
  report:   BarChart3,
}

const SEV_CONFIG = {
  critical: { icon: AlertCircle,   color: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/20' },
  warning:  { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  info:     { icon: Info,          color: 'text-blue-400',  bg: 'bg-blue-500/10 border-blue-500/20' },
  success:  { icon: CheckCircle,   color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
}

export default function Notifications() {
  const { addToast } = useApp()
  const [notifications, setNotifications] = useState(notificationsList)
  const [typeFilter, setTypeFilter] = useState('all')
  const [sevFilter, setSevFilter]   = useState('all')
  const [selectedId, setSelectedId] = useState(notifications[0]?.id)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const filtered = notifications.filter(n => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    if (sevFilter !== 'all' && n.severity !== sevFilter) return false
    if (showUnreadOnly && n.read) return false
    return true
  })

  const selected = notifications.find(n => n.id === selectedId)
  const unreadCount = notifications.filter(n => !n.read).length

  const markRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  const markAllRead = () => { setNotifications(prev => prev.map(n => ({ ...n, read: true }))); addToast('All notifications marked as read', 'success') }
  const deleteNotif = (id) => { setNotifications(prev => prev.filter(n => n.id !== id)); addToast('Notification deleted', 'success') }

  const types = [...new Set(notifications.map(n => n.type))]

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-100">Notification Center</h2>
          {unreadCount > 0 && (
            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setShowUnreadOnly(v => !v)}>
            {showUnreadOnly ? 'Show All' : 'Unread Only'}
          </Button>
          <Button size="sm" variant="outline" icon={CheckCheck} onClick={markAllRead}>Mark All Read</Button>
        </div>
      </div>

      <div className="flex gap-5 h-[calc(100vh-220px)]">
        {/* Left Panel */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          {/* Filters */}
          <div className="admin-card p-3 space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Filter by Type</div>
            {['all', ...types].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} className={clsx('flex items-center gap-2 w-full px-2.5 py-1.5 rounded text-sm transition-colors capitalize', typeFilter === t ? 'bg-blue-500/10 text-blue-400' : 'text-gray-400 hover:bg-gray-700/50')}>
                {t !== 'all' && TYPE_ICONS[t] && <span>{(() => { const I = TYPE_ICONS[t]; return <I size={13} /> })()}</span>}
                {t === 'all' ? 'All Types' : t}
              </button>
            ))}
            <div className="divider my-2 pt-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Severity</div>
              {['all', 'critical', 'warning', 'info', 'success'].map(s => (
                <button key={s} onClick={() => setSevFilter(s)} className={clsx('flex items-center gap-2 w-full px-2.5 py-1.5 rounded text-sm transition-colors capitalize', sevFilter === s ? 'bg-blue-500/10 text-blue-400' : 'text-gray-400 hover:bg-gray-700/50')}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Middle: Notification List */}
        <div className="flex-1 min-w-0 flex flex-col admin-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between shrink-0">
            <span className="text-sm font-semibold text-gray-100">{filtered.length} notifications</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Bell size={28} className="mb-3 opacity-40" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : filtered.map(n => {
              const Cfg = SEV_CONFIG[n.severity] || SEV_CONFIG.info
              const Icon = TYPE_ICONS[n.type] || Bell
              return (
                <div
                  key={n.id}
                  onClick={() => { setSelectedId(n.id); markRead(n.id) }}
                  className={clsx(
                    'flex items-start gap-3 px-4 py-3 border-b border-gray-700/40 cursor-pointer transition-colors',
                    selectedId === n.id ? 'bg-blue-500/10' : 'hover:bg-gray-700/30',
                    !n.read && 'border-l-2 border-l-blue-500'
                  )}
                >
                  <div className={clsx('mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border', Cfg.bg)}>
                    <Icon size={14} className={Cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className={clsx('text-sm font-medium truncate', !n.read ? 'text-gray-100' : 'text-gray-300')}>
                        {n.title}
                      </span>
                      {!n.read && <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1" />}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{n.tenant}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="w-80 shrink-0 admin-card flex flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between shrink-0">
                <span className="text-sm font-semibold text-gray-100">Details</span>
                <Button size="xs" variant="ghost" icon={Trash2} onClick={() => deleteNotif(selected.id)}>Delete</Button>
              </div>
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                {(() => {
                  const Cfg = SEV_CONFIG[selected.severity] || SEV_CONFIG.info
                  const Icon = TYPE_ICONS[selected.type] || Bell
                  return (
                    <div className={clsx('p-3 rounded-lg border flex items-start gap-3', Cfg.bg)}>
                      <Icon size={16} className={Cfg.color} />
                      <div>
                        <div className={clsx('text-sm font-semibold', Cfg.color)}>{selected.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5 capitalize">{selected.severity} · {selected.type}</div>
                      </div>
                    </div>
                  )
                })()}
                <div>
                  <div className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wider">Message</div>
                  <p className="text-sm text-gray-300 leading-relaxed">{selected.message}</p>
                </div>
                <dl className="space-y-2 text-sm">
                  {[
                    { label: 'Tenant',    value: selected.tenant },
                    { label: 'Timestamp', value: format(new Date(selected.timestamp), 'PPpp') },
                    { label: 'Status',    value: selected.read ? 'Read' : 'Unread' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between border-b border-gray-700/40 pb-2 last:border-0">
                      <dt className="text-gray-500">{label}</dt>
                      <dd className="text-gray-300">{value}</dd>
                    </div>
                  ))}
                </dl>
                <Button variant="outline" size="sm" className="w-full" onClick={() => addToast('Navigating to related resource...', 'info')}>
                  View Related Resource →
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Bell size={24} className="mb-2 opacity-40" />
              <p className="text-sm">Select a notification</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
