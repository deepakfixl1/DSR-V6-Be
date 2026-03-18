import { useState } from 'react'
import { UserPlus, Shield, Settings, MoreHorizontal, CheckCircle, XCircle, Mail, Lock, Edit, Trash2 } from 'lucide-react'
import { teamMembers } from '../data/mockData'
import { StatusBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { ConfirmModal } from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { format, formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const ROLES = [
  { id: 'super_admin',    label: 'Super Admin',    color: 'text-blue-400',   bg: 'bg-blue-500/10',   desc: 'Full platform access including destructive operations' },
  { id: 'billing_admin',  label: 'Billing Admin',  color: 'text-green-400',  bg: 'bg-green-500/10',  desc: 'Manage billing, invoices, refunds, and subscriptions' },
  { id: 'security_admin', label: 'Security Admin', color: 'text-red-400',    bg: 'bg-red-500/10',    desc: 'Security policies, audit logs, and threat management' },
  { id: 'support_admin',  label: 'Support Admin',  color: 'text-amber-400',  bg: 'bg-amber-500/10',  desc: 'Support tickets, tenant impersonation, user assistance' },
  { id: 'readonly_admin', label: 'Read-only Admin',color: 'text-gray-400',   bg: 'bg-gray-500/10',   desc: 'View-only access to all platform data and reports' },
]

const PERMISSIONS = {
  'Super Admin':     { tenants: '✓ Full', users: '✓ Full', billing: '✓ Full', security: '✓ Full', system: '✓ Full' },
  'Billing Admin':   { tenants: '✓ View', users: '✓ View', billing: '✓ Full', security: '— None', system: '— None' },
  'Security Admin':  { tenants: '✓ View', users: '✓ View', billing: '— None', security: '✓ Full', system: '✓ Limited' },
  'Support Admin':   { tenants: '✓ View', users: '✓ Edit', billing: '✓ View', security: '✓ View', system: '— None' },
  'Read-only Admin': { tenants: '✓ View', users: '✓ View', billing: '✓ View', security: '✓ View', system: '✓ View' },
}

export default function TeamManagement() {
  const { addToast } = useApp()
  const [members, setMembers] = useState(teamMembers)
  const [showInvite, setShowInvite] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [tab, setTab] = useState('Members')

  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'Support Admin' })

  const handleInvite = () => {
    if (!inviteForm.email) return
    addToast(`Invitation sent to ${inviteForm.email}`, 'success')
    setShowInvite(false)
    setInviteForm({ name: '', email: '', role: 'Support Admin' })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{members.length} admin members</span>
          <span className="text-gray-600">·</span>
          <span className="text-sm text-green-400">{members.filter(m => m.status === 'active').length} active</span>
        </div>
        <Button size="sm" icon={UserPlus} onClick={() => setShowInvite(true)}>Invite Admin</Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex gap-0">
          {['Members', 'Roles & Permissions'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={clsx('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors', tab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Members' && (
        <div className="space-y-3">
          {members.map(member => (
            <div key={member.id} className="admin-card p-4 flex items-center gap-4 hover:border-gray-600 transition-colors">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0" style={{ backgroundColor: member.avatar_color }}>
                {member.name.charAt(0)}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-100">{member.name}</span>
                  <StatusBadge status={member.status} />
                  {member.mfa ? (
                    <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={11} />MFA</span>
                  ) : (
                    <span className="text-xs text-amber-400 flex items-center gap-1"><XCircle size={11} />No MFA</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{member.email}</div>
                <div className="text-xs text-gray-600 mt-0.5">
                  Last active: {formatDistanceToNow(new Date(member.last_active), { addSuffix: true })}
                </div>
              </div>
              {/* Role */}
              <div className="shrink-0 text-right">
                <div className="text-sm font-medium text-violet-400">{member.role}</div>
              </div>
              {/* Actions */}
              <div className="shrink-0 flex gap-1">
                <Button size="xs" variant="ghost" icon={Mail} onClick={() => addToast(`Email sent to ${member.email}`, 'info')} />
                <Button size="xs" variant="ghost" icon={Edit} onClick={() => addToast('Edit member modal', 'info')} />
                {member.role !== 'Super Admin' && (
                  <Button size="xs" variant="ghost" icon={Trash2} onClick={() => setConfirmRemove(member)} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Roles & Permissions' && (
        <div className="space-y-5">
          {/* Role cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLES.map(role => (
              <div key={role.id} className="admin-card p-4">
                <div className={clsx('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md mb-2', role.bg, role.color)}>
                  <Shield size={11} />
                  {role.label}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{role.desc}</p>
                <div className="text-xs text-gray-600 mt-2">
                  {members.filter(m => m.role === role.label).length} member{members.filter(m => m.role === role.label).length !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>

          {/* Permissions matrix */}
          <Card noPad>
            <div className="px-5 py-4 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-100">Permissions Matrix</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Tenants</th>
                    <th>Users</th>
                    <th>Billing</th>
                    <th>Security</th>
                    <th>System</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(PERMISSIONS).map(([role, perms]) => (
                    <tr key={role}>
                      <td className="font-medium text-gray-200">{role}</td>
                      {Object.values(perms).map((p, i) => (
                        <td key={i}>
                          <span className={clsx('text-xs', p.startsWith('✓') ? 'text-green-400' : 'text-gray-600')}>{p}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Invite Modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite Admin User" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Full Name</label>
            <input className="admin-input" placeholder="Jane Doe" value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Email Address</label>
            <input type="email" className="admin-input" placeholder="jane@company.io" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Admin Role</label>
            <select className="admin-select" value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300">
            An invitation email will be sent. The user must set their own password and enable MFA before accessing the admin portal.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button icon={Mail} onClick={handleInvite} disabled={!inviteForm.email}>Send Invitation</Button>
          </div>
        </div>
      </Modal>

      {/* Remove Confirm */}
      {confirmRemove && (
        <ConfirmModal
          open
          onClose={() => setConfirmRemove(null)}
          title="Remove Admin"
          message={`Remove "${confirmRemove.name}" from the admin portal? They will immediately lose access.`}
          confirmLabel="Remove Admin"
          danger
          onConfirm={() => { setMembers(prev => prev.filter(m => m.id !== confirmRemove.id)); addToast(`${confirmRemove.name} removed`, 'warning') }}
        />
      )}
    </div>
  )
}
