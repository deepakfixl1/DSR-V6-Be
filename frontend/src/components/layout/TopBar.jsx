import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Bell, Sun, Moon, ChevronDown, User, LogOut, Settings, Shield, Activity, AlertCircle, CheckCircle } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import clsx from 'clsx'
import { format } from 'date-fns'

const BREADCRUMB_MAP = {
  '/dashboard':    ['Dashboard'],
  '/tenants':      ['Tenants', 'All Tenants'],
  '/users':        ['Users', 'All Users'],
  '/billing':      ['Billing', 'Overview'],
  '/security':     ['Security', 'Dashboard'],
  '/audit-logs':   ['Security', 'Audit Logs'],
  '/reports':      ['Insights', 'Reports'],
  '/notifications':['Insights', 'Notifications'],
  '/analytics':    ['Insights', 'Analytics'],
  '/system-config':['Platform', 'System Config'],
  '/support':      ['Operations', 'Support Tickets'],
  '/team':         ['Operations', 'Team Management'],
  '/developer':    ['Platform', 'Developer Tools'],
  '/automation':   ['Platform', 'Automations'],
  '/integrations': ['Platform', 'Integrations'],
}

const PAGE_TITLES = {
  '/dashboard':    'Dashboard',
  '/tenants':      'Tenant Management',
  '/users':        'User Management',
  '/billing':      'Billing & Revenue',
  '/security':     'Security Dashboard',
  '/audit-logs':   'Audit Log Viewer',
  '/reports':      'Report Builder',
  '/notifications':'Notification Center',
  '/analytics':    'Advanced Analytics',
  '/system-config':'System Configuration',
  '/support':      'Support Tickets',
  '/team':         'Team Management',
  '/developer':    'Developer Tools',
  '/automation':   'Workflow Automation',
  '/integrations': 'Integrations',
}

function NotificationPanel({ onClose }) {
  const { notificationsList } = { notificationsList: [] }
  const items = [
    { type: 'danger',  title: 'Payment failed – Acme Corp',         time: '2 min ago' },
    { type: 'warning', title: 'Storage at 92% – Globex Systems',    time: '15 min ago' },
    { type: 'info',    title: 'New tenant registered: Pied Piper',  time: '1 hr ago' },
    { type: 'danger',  title: 'Brute force attempt detected',       time: '2 hr ago' },
    { type: 'success', title: 'Monthly report generated',           time: '3 hr ago' },
    { type: 'warning', title: 'SLA breach – TKT-10009',             time: '5 hr ago' },
  ]

  return (
    <div className="absolute right-0 top-10 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-dropdown z-50 animate-slide-up overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <span className="text-sm font-semibold text-gray-100">Notifications</span>
        <span className="text-xs text-blue-400 cursor-pointer hover:text-blue-300">Mark all read</span>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {items.map((n, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-700/50 cursor-pointer border-b border-gray-700/40 last:border-0">
            <div className={clsx(
              'mt-0.5 shrink-0 w-2 h-2 rounded-full',
              n.type === 'danger'  ? 'bg-red-400' :
              n.type === 'warning' ? 'bg-amber-400' :
              n.type === 'success' ? 'bg-green-400' : 'bg-blue-400'
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 truncate">{n.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{n.time}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 border-t border-gray-700 text-center">
        <a href="/notifications" className="text-xs text-blue-400 hover:text-blue-300">View all notifications →</a>
      </div>
    </div>
  )
}

function ProfileMenu({ onClose }) {
  return (
    <div className="absolute right-0 top-10 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-dropdown z-50 animate-slide-up overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="text-sm font-semibold text-gray-100">Victor Reyes</div>
        <div className="text-xs text-gray-500">Super Admin</div>
        <div className="text-xs text-gray-600 font-mono mt-1">victor@dsrplatform.io</div>
      </div>
      {[
        { icon: User,     label: 'Profile Settings' },
        { icon: Shield,   label: 'Security' },
        { icon: Settings, label: 'Preferences' },
      ].map(({ icon: Icon, label }) => (
        <button key={label} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700/60 hover:text-gray-100 transition-colors">
          <Icon size={14} className="text-gray-500" />
          {label}
        </button>
      ))}
      <div className="border-t border-gray-700">
        <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  )
}

export default function TopBar() {
  const { theme, toggleTheme, notifications, setCommandPaletteOpen } = useApp()
  const location = useLocation()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const path = location.pathname
  const crumbs = BREADCRUMB_MAP[path] || ['Admin', path.split('/').filter(Boolean).join(' / ')]
  const pageTitle = PAGE_TITLES[path] || path.split('/').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')

  useEffect(() => {
    const handle = () => { setShowNotifs(false); setShowProfile(false) }
    document.addEventListener('click', handle)
    return () => document.removeEventListener('click', handle)
  }, [])

  return (
    <header className="h-14 shrink-0 flex items-center gap-4 px-6 border-b border-gray-700/60 bg-gray-900/80 backdrop-blur-sm">
      {/* Breadcrumbs + Page Title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-0.5">
          <span>Admin</span>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span>/</span>
              <span className={i === crumbs.length - 1 ? 'text-gray-400' : ''}>{c}</span>
            </span>
          ))}
        </div>
        <h1 className="text-base font-semibold text-gray-100 leading-none truncate">{pageTitle}</h1>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search */}
        <button
          onClick={(e) => { e.stopPropagation(); setCommandPaletteOpen(true) }}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-gray-500 hover:border-gray-600 text-sm transition-colors w-44"
        >
          <Search size={13} />
          <span className="flex-1 text-left text-xs">Quick search...</span>
          <kbd className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </button>

        {/* System health */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-gray-700 bg-gray-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs text-gray-400 font-medium hidden sm:block">99.97%</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notifications */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false) }}
            className="relative p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          >
            <Bell size={15} />
            {notifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {notifications > 9 ? '9+' : notifications}
              </span>
            )}
          </button>
          {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
        </div>

        {/* Profile */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifs(false) }}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-md hover:bg-gray-700 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">V</div>
            <span className="text-sm text-gray-300 hidden md:block">Victor R.</span>
            <ChevronDown size={12} className="text-gray-500" />
          </button>
          {showProfile && <ProfileMenu onClose={() => setShowProfile(false)} />}
        </div>
      </div>
    </header>
  )
}
