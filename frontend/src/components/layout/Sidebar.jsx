import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Building2, Users, CreditCard, Shield, FileText,
  BarChart3, Bell, Settings, HelpCircle, Code2, Workflow, Plug,
  ChevronDown, ChevronRight, Users2, Search, Menu, X,
  AlertTriangle, TrendingUp, Zap, Database
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import clsx from 'clsx'

const NAV = [
  {
    label: 'P0 — Core',
    items: [
      { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',       badge: null },
      { to: '/tenants',     icon: Building2,        label: 'Tenants',         badge: 25 },
      { to: '/users',       icon: Users,            label: 'Users',           badge: null },
      { to: '/billing',     icon: CreditCard,       label: 'Billing',         badge: 3, badgeColor: 'red' },
      { to: '/security',    icon: Shield,           label: 'Security',        badge: 8, badgeColor: 'red' },
      { to: '/audit-logs',  icon: FileText,         label: 'Audit Logs',      badge: null },
    ],
  },
  {
    label: 'P1 — Insights',
    items: [
      { to: '/reports',       icon: BarChart3,  label: 'Reports',      badge: null },
      { to: '/notifications', icon: Bell,       label: 'Notifications', badge: 12, badgeColor: 'blue' },
      { to: '/analytics',     icon: TrendingUp, label: 'Analytics',    badge: null },
      { to: '/system-config', icon: Settings,   label: 'System Config', badge: null },
    ],
  },
  {
    label: 'P2 — Operations',
    items: [
      { to: '/support', icon: HelpCircle, label: 'Support',         badge: 7, badgeColor: 'amber' },
      { to: '/team',    icon: Users2,     label: 'Team Mgmt',       badge: null },
    ],
  },
  {
    label: 'P3 — Platform',
    items: [
      { to: '/developer',   icon: Code2,     label: 'Developer Tools', badge: null },
      { to: '/automation',  icon: Workflow,  label: 'Automations',     badge: null },
      { to: '/integrations',icon: Plug,      label: 'Integrations',    badge: 2, badgeColor: 'green' },
    ],
  },
]

function NavItem({ item, collapsed }) {
  const location = useLocation()
  const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/')

  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={clsx(
        'nav-item group relative',
        isActive && 'active',
        collapsed && 'justify-center px-2'
      )}
    >
      <item.icon size={16} className={clsx('shrink-0', isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-gray-200')} />
      {!collapsed && (
        <span className="flex-1 truncate">{item.label}</span>
      )}
      {!collapsed && item.badge != null && (
        <span className={clsx(
          'text-xs font-semibold px-1.5 py-0.5 rounded-full tabular-nums',
          item.badgeColor === 'red'   ? 'bg-red-500/20 text-red-400' :
          item.badgeColor === 'amber' ? 'bg-amber-500/20 text-amber-400' :
          item.badgeColor === 'green' ? 'bg-green-500/20 text-green-400' :
                                        'bg-blue-500/20 text-blue-400'
        )}>
          {item.badge}
        </span>
      )}
      {collapsed && item.badge != null && (
        <span className={clsx(
          'absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center',
          item.badgeColor === 'red' ? 'bg-red-500' : 'bg-blue-500'
        )}>
          {item.badge > 9 ? '9+' : item.badge}
        </span>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, setCommandPaletteOpen } = useApp()
  const [collapsedSections, setCollapsedSections] = useState({})

  const toggleSection = (label) => {
    setCollapsedSections(prev => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <aside className={clsx(
      'flex flex-col h-full bg-gray-900 border-r border-gray-700/60 transition-all duration-200 select-none',
      sidebarCollapsed ? 'w-14' : 'w-56'
    )}>
      {/* Logo + Toggle */}
      <div className={clsx('flex items-center border-b border-gray-700/60 h-14 shrink-0', sidebarCollapsed ? 'justify-center px-2' : 'px-4 gap-3')}>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
            <Database size={13} className="text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-100 tracking-tight leading-none">DSR Admin</div>
              <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">Control Tower</div>
            </div>
          )}
        </div>
        {!sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="ml-auto text-gray-500 hover:text-gray-300 p-1 rounded transition-colors"
          >
            <X size={14} />
          </button>
        )}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute -right-3 top-4 w-6 h-6 bg-gray-800 border border-gray-600 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors z-10"
          >
            <Menu size={10} />
          </button>
        )}
      </div>

      {/* Search */}
      {!sidebarCollapsed && (
        <div className="px-3 py-2.5 border-b border-gray-700/60">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md bg-gray-800 border border-gray-700 text-gray-500 hover:border-gray-600 text-xs transition-colors"
          >
            <Search size={12} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-[10px] bg-gray-700 px-1 rounded font-mono">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-hidden">
        {NAV.map((section) => {
          const isSectionCollapsed = collapsedSections[section.label]
          return (
            <div key={section.label} className="mb-1">
              {!sidebarCollapsed && (
                <button
                  onClick={() => toggleSection(section.label)}
                  className="flex items-center gap-1.5 w-full px-4 py-1.5 text-[10px] font-semibold text-gray-500 hover:text-gray-400 uppercase tracking-widest transition-colors"
                >
                  {isSectionCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                  {section.label}
                </button>
              )}
              {(!isSectionCollapsed || sidebarCollapsed) && (
                <div className={clsx('space-y-0.5', sidebarCollapsed ? 'px-1.5' : 'px-2')}>
                  {section.items.map((item) => (
                    <NavItem key={item.to} item={item} collapsed={sidebarCollapsed} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* System Status */}
      {!sidebarCollapsed && (
        <div className="px-4 py-3 border-t border-gray-700/60">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center">
              <span className="status-dot bg-green-400 live-dot" />
            </div>
            <span className="text-xs text-gray-500">All systems operational</span>
          </div>
        </div>
      )}
    </aside>
  )
}
