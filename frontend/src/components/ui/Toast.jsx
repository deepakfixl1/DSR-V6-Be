import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import clsx from 'clsx'

const CONFIG = {
  success: { icon: CheckCircle,   bar: 'bg-green-500', icon_cls: 'text-green-400' },
  error:   { icon: AlertCircle,   bar: 'bg-red-500',   icon_cls: 'text-red-400'   },
  warning: { icon: AlertTriangle, bar: 'bg-amber-500', icon_cls: 'text-amber-400' },
  info:    { icon: Info,          bar: 'bg-blue-500',  icon_cls: 'text-blue-400'  },
}

export default function Toast({ toast, onDismiss }) {
  const { type = 'success', message, id } = toast
  const cfg = CONFIG[type] || CONFIG.success
  const Icon = cfg.icon

  return (
    <div className="toast-enter flex items-center gap-3 min-w-72 max-w-sm bg-gray-800 border border-gray-700 rounded-lg shadow-dropdown overflow-hidden pr-3">
      <div className={clsx('w-1 self-stretch shrink-0', cfg.bar)} />
      <Icon size={15} className={clsx('shrink-0', cfg.icon_cls)} />
      <span className="flex-1 py-3 text-sm text-gray-200">{message}</span>
      <button onClick={() => onDismiss(id)} className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors p-1">
        <X size={13} />
      </button>
    </div>
  )
}
