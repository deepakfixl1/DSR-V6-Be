import { useState } from 'react'
import { Settings, Mail, Database, Plug, Flag, Wrench, Save, ChevronDown, ChevronRight, AlertTriangle, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react'
import { systemConfig } from '../data/mockData'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import clsx from 'clsx'

const SECTIONS = [
  { key: 'general',     label: 'General',       icon: Settings,  color: 'text-blue-400' },
  { key: 'email',       label: 'Email',         icon: Mail,      color: 'text-green-400' },
  { key: 'storage',     label: 'Storage',       icon: Database,  color: 'text-amber-400' },
  { key: 'security',    label: 'Security',      icon: Settings,  color: 'text-red-400' },
  { key: 'features',    label: 'Feature Flags', icon: Flag,      color: 'text-violet-400' },
  { key: 'maintenance', label: 'Maintenance',   icon: Wrench,    color: 'text-orange-400' },
]

function ToggleSwitch({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className={clsx('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', value ? 'bg-blue-600' : 'bg-gray-600')}>
      <span className={clsx('inline-block h-3 w-3 rounded-full bg-white transition-transform', value ? 'translate-x-5' : 'translate-x-1')} />
    </button>
  )
}

export default function SystemConfig() {
  const { addToast } = useApp()
  const [activeSection, setActiveSection] = useState('general')
  const [config, setConfig] = useState(systemConfig)
  const [collapsed, setCollapsed] = useState({})
  const [dirty, setDirty] = useState(false)

  const update = (section, key, value) => {
    setConfig(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }))
    setDirty(true)
  }

  const save = () => {
    addToast('Configuration saved successfully', 'success')
    setDirty(false)
  }

  const section = config[activeSection] || {}

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Warning banner */}
      <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-300">
          <strong>Changes take effect immediately.</strong> All configuration changes are logged in the audit trail.
        </div>
      </div>

      <div className="flex gap-5">
        {/* Section Nav */}
        <div className="w-48 shrink-0">
          <div className="admin-card p-2 space-y-0.5">
            {SECTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={clsx(
                  'flex items-center gap-2.5 w-full px-3 py-2.5 rounded text-sm transition-colors',
                  activeSection === s.key ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:bg-gray-700/50'
                )}
              >
                <s.icon size={14} className={activeSection === s.key ? 'text-blue-400' : s.color} />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Config Form */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-100">
              {SECTIONS.find(s => s.key === activeSection)?.label} Settings
            </h3>
            {dirty && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-400">Unsaved changes</span>
                <Button size="sm" icon={Save} onClick={save}>Save Changes</Button>
              </div>
            )}
          </div>

          {activeSection === 'general' && (
            <Card>
              <div className="space-y-4">
                {[
                  { label: 'Platform Name',     key: 'platform_name',    type: 'text' },
                  { label: 'Support Email',      key: 'support_email',    type: 'email' },
                  { label: 'Max Tenants',        key: 'max_tenants',      type: 'number' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{field.label}</label>
                    <input type={field.type} value={section[field.key] || ''} onChange={e => update('general', field.key, e.target.value)} className="admin-input" />
                  </div>
                ))}
                {[
                  { label: 'Maintenance Mode',    key: 'maintenance_mode',  desc: 'Show maintenance page to all users' },
                  { label: 'Open Registration',   key: 'registration_open', desc: 'Allow new tenant self-registration' },
                ].map(toggle => (
                  <div key={toggle.key} className="flex items-center justify-between py-2 border-t border-gray-700">
                    <div>
                      <div className="text-sm text-gray-200">{toggle.label}</div>
                      <div className="text-xs text-gray-500">{toggle.desc}</div>
                    </div>
                    <ToggleSwitch value={section[toggle.key]} onChange={v => update('general', toggle.key, v)} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeSection === 'email' && (
            <Card>
              <div className="space-y-4">
                {[
                  { label: 'Email Provider',  key: 'provider',    type: 'text' },
                  { label: 'From Name',        key: 'from_name',   type: 'text' },
                  { label: 'From Email',       key: 'from_email',  type: 'email' },
                  { label: 'SMTP Host',        key: 'smtp_host',   type: 'text' },
                  { label: 'SMTP Port',        key: 'smtp_port',   type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{f.label}</label>
                    <input type={f.type} value={section[f.key] || ''} onChange={e => update('email', f.key, e.target.value)} className="admin-input" />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addToast('Test email sent to victor@dsrplatform.io', 'success')}>Send Test Email</Button>
              </div>
            </Card>
          )}

          {activeSection === 'storage' && (
            <Card>
              <div className="space-y-4">
                {[
                  { label: 'Storage Provider',  key: 'provider' },
                  { label: 'S3 Bucket',         key: 'bucket' },
                  { label: 'AWS Region',         key: 'region' },
                  { label: 'Max Upload (MB)',    key: 'max_upload_mb' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{f.label}</label>
                    <input value={section[f.key] || ''} onChange={e => update('storage', f.key, e.target.value)} className="admin-input" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card>
              <div className="space-y-4">
                {[
                  { label: 'Session Timeout (min)',    key: 'session_timeout_minutes', type: 'number' },
                  { label: 'Max Login Attempts',       key: 'max_login_attempts',      type: 'number' },
                  { label: 'Lockout Duration (min)',   key: 'lockout_duration_minutes',type: 'number' },
                  { label: 'Password Min Length',      key: 'password_min_length',     type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{f.label}</label>
                    <input type={f.type} value={section[f.key] || ''} onChange={e => update('security', f.key, Number(e.target.value))} className="admin-input w-32" />
                  </div>
                ))}
                {[
                  { label: 'Require MFA for all users',  key: 'require_mfa' },
                  { label: 'IP Whitelist Enabled',       key: 'ip_whitelist_enabled' },
                  { label: 'Require Special Characters', key: 'password_require_special' },
                ].map(t => (
                  <div key={t.key} className="flex items-center justify-between border-t border-gray-700 pt-3">
                    <span className="text-sm text-gray-200">{t.label}</span>
                    <ToggleSwitch value={section[t.key]} onChange={v => update('security', t.key, v)} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeSection === 'features' && (
            <Card title="Feature Flags">
              <div className="space-y-0 divide-y divide-gray-700/40">
                {Object.entries(config.features || {}).map(([key, value]) => {
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                  return (
                    <div key={key} className="flex items-center justify-between py-3">
                      <div>
                        <div className="text-sm text-gray-200">{label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Feature flag: <code className="font-mono">{key}</code></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={clsx('text-xs', value ? 'text-green-400' : 'text-gray-500')}>{value ? 'Enabled' : 'Disabled'}</span>
                        <ToggleSwitch value={value} onChange={v => update('features', key, v)} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {activeSection === 'maintenance' && (
            <div className="space-y-4">
              <Card title="Maintenance Window">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Start Time</label>
                      <input type="datetime-local" className="admin-input" defaultValue="2026-03-05T02:00" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">End Time</label>
                      <input type="datetime-local" className="admin-input" defaultValue="2026-03-05T04:00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Maintenance Message</label>
                    <textarea rows={3} defaultValue="We are currently performing scheduled maintenance. We'll be back shortly." className="admin-input resize-none" />
                  </div>
                  <Button variant="warning" size="sm" onClick={() => addToast('Maintenance mode scheduled for March 5, 2026 at 2:00 AM', 'warning')}>Schedule Maintenance</Button>
                </div>
              </Card>
              <Card title="Backup & Recovery">
                <div className="space-y-3">
                  {[
                    { label: 'Last Backup',     value: 'March 1, 2026 at 3:00 AM',   status: 'success' },
                    { label: 'Backup Size',     value: '847 GB',                       status: null },
                    { label: 'Recovery Point',  value: '< 4 hours',                    status: null },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between text-sm border-b border-gray-700/40 pb-2 last:border-0">
                      <span className="text-gray-400">{item.label}</span>
                      <span className={item.status === 'success' ? 'text-green-400' : 'text-gray-200'}>{item.value}</span>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addToast('Manual backup initiated...', 'info')}>Run Manual Backup</Button>
                </div>
              </Card>
            </div>
          )}

          {dirty && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setConfig(systemConfig); setDirty(false) }}>Discard Changes</Button>
              <Button size="sm" icon={Save} onClick={save}>Save Changes</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
