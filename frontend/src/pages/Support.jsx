import { useState } from 'react'
import { Search, Plus, Filter, MessageSquare, Clock, AlertTriangle, CheckCircle, User, Tag } from 'lucide-react'
import { supportTickets } from '../data/mockData'
import { StatusBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import clsx from 'clsx'

const PRIORITY_COLORS = { critical: 'text-red-400 bg-red-500/10 border-red-500/20', high: 'text-orange-400 bg-orange-500/10 border-orange-500/20', medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20', low: 'text-gray-400 bg-gray-500/10 border-gray-500/20' }
const MOCK_MESSAGES = [
  { author: 'Customer', text: 'We are unable to export our weekly reports. The export button shows a spinner but never completes.', time: '2h ago', internal: false },
  { author: 'Support', text: 'Thank you for reporting this. I can see the issue in our logs. This is related to a queue backlog on our export service.', time: '1h 45m ago', internal: false },
  { author: 'Support', text: 'Internal note: Escalating to engineering team – export service queue is at 142 items.', time: '1h 40m ago', internal: true },
  { author: 'Customer', text: 'Any update on this? Our team is blocked for the weekly meeting.', time: '30m ago', internal: false },
]

export default function Support() {
  const { addToast } = useApp()
  const [tickets, setTickets] = useState(supportTickets)
  const [selectedId, setSelectedId] = useState(tickets[0]?.id)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatus] = useState('all')
  const [priorityFilter, setPriority] = useState('all')
  const [newNote, setNewNote] = useState('')
  const [isInternal, setIsInternal] = useState(false)

  const filtered = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase()) && !t.tenant.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const selected = tickets.find(t => t.id === selectedId)

  const handleSend = () => {
    if (!newNote.trim()) return
    addToast(isInternal ? 'Internal note added' : 'Reply sent', 'success')
    setNewNote('')
  }

  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    sla_breach: tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed' && isPast(new Date(t.sla_deadline))).length,
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Open Tickets',  value: stats.open,        color: 'text-blue-400' },
          { label: 'In Progress',   value: stats.in_progress, color: 'text-amber-400' },
          { label: 'SLA Breaches',  value: stats.sla_breach,  color: 'text-red-400' },
          { label: 'Resolved (7d)', value: tickets.filter(t => t.status === 'resolved').length, color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="admin-card px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">{s.label}</span>
            <span className={clsx('text-2xl font-bold tabular-nums', s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-4 h-[calc(100vh-260px)]">
        {/* Ticket List */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input className="admin-input pl-8 text-xs" placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" icon={Plus} onClick={() => addToast('New ticket modal', 'info')}>New</Button>
          </div>
          <div className="flex gap-1">
            {['all', 'open', 'in_progress', 'resolved'].map(s => (
              <button key={s} onClick={() => setStatus(s)} className={clsx('flex-1 py-1 text-xs rounded transition-colors capitalize', statusFilter === s ? 'bg-gray-600 text-gray-100' : 'bg-gray-800 text-gray-500 hover:bg-gray-700')}>
                {s === 'in_progress' ? 'Active' : s}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto admin-card divide-y divide-gray-700/40">
            {filtered.map(t => {
              const slaBreached = t.status !== 'resolved' && t.status !== 'closed' && isPast(new Date(t.sla_deadline))
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={clsx('p-3 cursor-pointer transition-colors', selectedId === t.id ? 'bg-blue-500/10' : 'hover:bg-gray-700/30')}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-gray-100 leading-tight">{t.subject}</span>
                    <span className={clsx('text-[10px] px-1.5 py-0.5 rounded border font-semibold capitalize shrink-0', PRIORITY_COLORS[t.priority])}>
                      {t.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{t.id} · {t.tenant}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  {slaBreached && (
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-red-400">
                      <AlertTriangle size={9} />SLA BREACH
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Ticket Detail */}
        {selected ? (
          <div className="flex-1 admin-card flex flex-col overflow-hidden">
            {/* Ticket header */}
            <div className="px-5 py-4 border-b border-gray-700 shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-500">{selected.id}</span>
                    <StatusBadge status={selected.status} />
                    <span className={clsx('text-xs px-2 py-0.5 rounded border font-semibold capitalize', PRIORITY_COLORS[selected.priority])}>
                      {selected.priority}
                    </span>
                    {isPast(new Date(selected.sla_deadline)) && selected.status !== 'resolved' && (
                      <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                        <AlertTriangle size={10} /> SLA Breach
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-gray-100">{selected.subject}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span><User size={10} className="inline mr-1" />{selected.requester}</span>
                    <span><MessageSquare size={10} className="inline mr-1" />{selected.messages} messages</span>
                    <span><Clock size={10} className="inline mr-1" />SLA: {format(new Date(selected.sla_deadline), 'MMM d, HH:mm')}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {selected.assignee
                    ? <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">{selected.assignee}</span>
                    : <Button size="xs" variant="outline" icon={User} onClick={() => addToast('Assigned to you', 'success')}>Assign to Me</Button>}
                  <Button size="xs" variant="success" icon={CheckCircle} onClick={() => addToast('Ticket resolved', 'success')}>Resolve</Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {MOCK_MESSAGES.map((msg, i) => (
                <div key={i} className={clsx('flex gap-3', msg.internal && 'opacity-80')}>
                  <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0', msg.author === 'Customer' ? 'bg-blue-600' : 'bg-gray-600')}>
                    {msg.author.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-200">{msg.author}</span>
                      <span className="text-xs text-gray-500">{msg.time}</span>
                      {msg.internal && <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-semibold">INTERNAL</span>}
                    </div>
                    <div className={clsx('text-sm text-gray-300 p-3 rounded-lg', msg.internal ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-gray-700/40')}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply box */}
            <div className="px-5 py-4 border-t border-gray-700 shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setIsInternal(false)} className={clsx('text-xs px-2.5 py-1 rounded transition-colors', !isInternal ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700')}>Public Reply</button>
                <button onClick={() => setIsInternal(true)} className={clsx('text-xs px-2.5 py-1 rounded transition-colors', isInternal ? 'bg-amber-600 text-white' : 'text-gray-400 hover:bg-gray-700')}>Internal Note</button>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder={isInternal ? 'Add internal note (not visible to customer)...' : 'Write a reply...'}
                  rows={2}
                  className={clsx('admin-input flex-1 resize-none', isInternal && 'border-amber-500/30 focus:border-amber-500')}
                />
                <Button onClick={handleSend} disabled={!newNote.trim()}>Send</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 admin-card flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Select a ticket</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
