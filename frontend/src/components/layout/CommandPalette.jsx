import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LayoutDashboard, Building2, Users, CreditCard, Shield, FileText, BarChart3, Bell, Settings, HelpCircle, Code2, Workflow, Plug, TrendingUp, Users2, ArrowRight } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import clsx from 'clsx'

const COMMANDS = [
  { label: 'Dashboard',          path: '/dashboard',    icon: LayoutDashboard, group: 'Navigation' },
  { label: 'Tenants',            path: '/tenants',      icon: Building2,       group: 'Navigation' },
  { label: 'Users',              path: '/users',        icon: Users,           group: 'Navigation' },
  { label: 'Billing',            path: '/billing',      icon: CreditCard,      group: 'Navigation' },
  { label: 'Security',           path: '/security',     icon: Shield,          group: 'Navigation' },
  { label: 'Audit Logs',         path: '/audit-logs',   icon: FileText,        group: 'Navigation' },
  { label: 'Reports',            path: '/reports',      icon: BarChart3,       group: 'Navigation' },
  { label: 'Notifications',      path: '/notifications',icon: Bell,            group: 'Navigation' },
  { label: 'Analytics',          path: '/analytics',    icon: TrendingUp,      group: 'Navigation' },
  { label: 'Support Tickets',    path: '/support',      icon: HelpCircle,      group: 'Navigation' },
  { label: 'Team Management',    path: '/team',         icon: Users2,          group: 'Navigation' },
  { label: 'Developer Tools',    path: '/developer',    icon: Code2,           group: 'Navigation' },
  { label: 'Workflow Automation',path: '/automation',   icon: Workflow,        group: 'Navigation' },
  { label: 'Integrations',       path: '/integrations', icon: Plug,            group: 'Navigation' },
  { label: 'System Configuration',path:'/system-config',icon: Settings,        group: 'Navigation' },
]

export default function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useApp()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const filtered = query.length === 0
    ? COMMANDS
    : COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commandPaletteOpen])

  useEffect(() => {
    const handle = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
      if (e.key === 'Escape') setCommandPaletteOpen(false)
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [setCommandPaletteOpen])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (filtered[selected]) {
        navigate(filtered[selected].path)
        setCommandPaletteOpen(false)
      }
    }
  }, [filtered, selected, navigate, setCommandPaletteOpen])

  useEffect(() => { setSelected(0) }, [query])

  if (!commandPaletteOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 cmd-palette-overlay"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-gray-800 border border-gray-600 rounded-xl shadow-modal overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, actions, tenants..."
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 text-sm outline-none"
          />
          <kbd className="text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">No results for "{query}"</div>
          ) : (
            <>
              <div className="px-4 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Navigation</div>
              {filtered.map((cmd, i) => (
                <button
                  key={cmd.path}
                  className={clsx(
                    'flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors',
                    i === selected ? 'bg-blue-500/15 text-blue-300' : 'text-gray-300 hover:bg-gray-700/50'
                  )}
                  onClick={() => { navigate(cmd.path); setCommandPaletteOpen(false) }}
                  onMouseEnter={() => setSelected(i)}
                >
                  <cmd.icon size={14} className={i === selected ? 'text-blue-400' : 'text-gray-500'} />
                  <span className="flex-1">{cmd.label}</span>
                  <ArrowRight size={12} className={clsx('transition-opacity', i === selected ? 'opacity-100 text-blue-400' : 'opacity-0')} />
                </button>
              ))}
            </>
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-700 flex items-center gap-4 text-[11px] text-gray-600">
          <span><kbd className="bg-gray-700 px-1 rounded">↑↓</kbd> Navigate</span>
          <span><kbd className="bg-gray-700 px-1 rounded">Enter</kbd> Go</span>
          <span><kbd className="bg-gray-700 px-1 rounded">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}
