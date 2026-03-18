import { useState } from 'react'
import { Workflow, Plus, Play, Pause, Trash2, Edit, CheckCircle, Clock, Zap, ArrowRight, ToggleLeft, ToggleRight } from 'lucide-react'
import { automations } from '../data/mockData'
import { StatusBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { format, formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const TRIGGER_TYPES = [
  'billing.payment_failed', 'tenant.trial_expiring', 'tenant.created', 'tenant.suspended',
  'security.brute_force', 'security.suspicious_login', 'user.locked',
  'schedule.daily', 'schedule.weekly', 'schedule.monthly',
  'tenant.storage_85pct', 'tenant.api_limit_90pct',
]

const ACTION_TYPES = [
  'Send Slack notification', 'Send email notification', 'Suspend tenant',
  'Lock user account', 'Create support ticket', 'Add audit log entry',
  'Trigger webhook', 'Generate report', 'Send PagerDuty alert',
]

export default function WorkflowAutomation() {
  const { addToast } = useApp()
  const [workflows, setWorkflows] = useState(automations)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', trigger: TRIGGER_TYPES[0], actions: [ACTION_TYPES[0]] })

  const toggle = (id) => {
    setWorkflows(prev => prev.map(w =>
      w.id === id ? { ...w, status: w.status === 'active' ? 'paused' : 'active' } : w
    ))
    const wf = workflows.find(w => w.id === id)
    addToast(`Workflow "${wf.name}" ${wf.status === 'active' ? 'paused' : 'activated'}`, wf.status === 'active' ? 'warning' : 'success')
  }

  const remove = (id) => {
    const wf = workflows.find(w => w.id === id)
    setWorkflows(prev => prev.filter(w => w.id !== id))
    addToast(`Workflow "${wf.name}" deleted`, 'warning')
  }

  const runNow = (wf) => {
    addToast(`Running "${wf.name}"...`, 'info')
    setTimeout(() => addToast(`Workflow "${wf.name}" completed`, 'success'), 1200)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Workflows', value: workflows.length,                               color: 'text-blue-400' },
          { label: 'Active',          value: workflows.filter(w => w.status === 'active').length, color: 'text-green-400' },
          { label: 'Total Runs',      value: workflows.reduce((s, w) => s + w.runs, 0),     color: 'text-violet-400' },
          { label: 'Paused',          value: workflows.filter(w => w.status === 'paused').length, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="admin-card px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">{s.label}</span>
            <span className={clsx('text-xl font-bold', s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Button size="sm" icon={Plus} onClick={() => setShowNew(true)}>New Automation</Button>
      </div>

      {/* Workflow List */}
      <div className="space-y-3">
        {workflows.map(wf => (
          <div key={wf.id} className={clsx('admin-card p-5 hover:border-gray-600 transition-colors', wf.status === 'paused' && 'opacity-70')}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5', wf.status === 'active' ? 'bg-blue-500/15' : 'bg-gray-700')}>
                  <Workflow size={15} className={wf.status === 'active' ? 'text-blue-400' : 'text-gray-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-100">{wf.name}</span>
                    <StatusBadge status={wf.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-gray-700 rounded px-2 py-1">
                      <Zap size={10} className="text-amber-400" />
                      <code className="text-amber-300 font-mono">{wf.trigger}</code>
                    </div>
                    <ArrowRight size={12} className="text-gray-600" />
                    <div className="flex items-center gap-1.5 bg-gray-700 rounded px-2 py-1">
                      <CheckCircle size={10} className="text-green-400" />
                      <span className="text-green-300">{wf.actions} action{wf.actions !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                    <span><Clock size={10} className="inline mr-1" />Last run: {formatDistanceToNow(new Date(wf.last_run), { addSuffix: true })}</span>
                    <span>{wf.runs.toLocaleString()} total runs</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="xs" variant="ghost" icon={Play} onClick={() => runNow(wf)}>Run</Button>
                <Button size="xs" variant="ghost" onClick={() => toggle(wf.id)}>
                  {wf.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
                </Button>
                <Button size="xs" variant="ghost" icon={Edit} onClick={() => addToast('Edit workflow', 'info')} />
                <Button size="xs" variant="ghost" icon={Trash2} onClick={() => remove(wf.id)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Workflow Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create Automation" size="md">
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Workflow Name</label>
            <input className="admin-input" placeholder="e.g., Alert on brute force" value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          {/* Trigger */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Trigger Event</label>
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <Zap size={14} className="text-amber-400 shrink-0" />
              <select className="flex-1 bg-transparent text-amber-300 text-sm outline-none font-mono" value={newForm.trigger} onChange={e => setNewForm(f => ({ ...f, trigger: e.target.value }))}>
                {TRIGGER_TYPES.map(t => <option key={t} value={t} className="bg-gray-800 text-gray-200">{t}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <div className="flex-1 h-px bg-gray-700" />
            <ArrowRight size={14} />
            <div className="flex-1 h-px bg-gray-700" />
          </div>

          {/* Actions */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Actions</label>
            <div className="space-y-2">
              {newForm.actions.map((action, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle size={14} className="text-green-400 shrink-0" />
                  <select className="flex-1 bg-transparent text-green-300 text-sm outline-none" value={action} onChange={e => setNewForm(f => ({ ...f, actions: f.actions.map((a, j) => j === i ? e.target.value : a) }))}>
                    {ACTION_TYPES.map(a => <option key={a} value={a} className="bg-gray-800 text-gray-200">{a}</option>)}
                  </select>
                  {newForm.actions.length > 1 && (
                    <button className="text-gray-500 hover:text-red-400" onClick={() => setNewForm(f => ({ ...f, actions: f.actions.filter((_, j) => j !== i) }))}>×</button>
                  )}
                </div>
              ))}
              <Button size="xs" variant="ghost" icon={Plus} onClick={() => setNewForm(f => ({ ...f, actions: [...f.actions, ACTION_TYPES[0]] }))}>
                Add Action
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button size="sm" onClick={() => {
              if (!newForm.name) return
              setWorkflows(prev => [...prev, { id: `auto_${Date.now()}`, name: newForm.name, trigger: newForm.trigger, actions: newForm.actions.length, status: 'active', runs: 0, last_run: new Date().toISOString() }])
              addToast(`Automation "${newForm.name}" created`, 'success')
              setShowNew(false)
              setNewForm({ name: '', trigger: TRIGGER_TYPES[0], actions: [ACTION_TYPES[0]] })
            }} disabled={!newForm.name}>
              Create Automation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
