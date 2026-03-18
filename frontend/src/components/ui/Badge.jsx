import clsx from 'clsx'

const VARIANTS = {
  success:  'bg-green-500/15 text-green-400 border-green-500/20',
  warning:  'bg-amber-500/15 text-amber-400 border-amber-500/20',
  danger:   'bg-red-500/15 text-red-400 border-red-500/20',
  info:     'bg-blue-500/15 text-blue-400 border-blue-500/20',
  purple:   'bg-violet-500/15 text-violet-400 border-violet-500/20',
  gray:     'bg-gray-500/15 text-gray-400 border-gray-500/20',
  amber:    'bg-amber-500/15 text-amber-400 border-amber-500/20',
  cyan:     'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
}

const STATUS_VARIANTS = {
  active:    'success',
  inactive:  'gray',
  suspended: 'danger',
  trial:     'amber',
  locked:    'danger',
  pending:   'warning',
  paid:      'success',
  failed:    'danger',
  delivered: 'success',
  open:      'info',
  in_progress:'warning',
  waiting:   'amber',
  resolved:  'success',
  closed:    'gray',
  connected:    'success',
  disconnected: 'gray',
  paused:       'amber',
  critical: 'danger',
  high:     'warning',
  medium:   'amber',
  low:      'gray',
}

export default function Badge({ variant = 'gray', children, dot = false, className }) {
  const v = STATUS_VARIANTS[variant] || VARIANTS[variant] ? variant : 'gray'
  const cls = STATUS_VARIANTS[v] ? VARIANTS[STATUS_VARIANTS[v]] : (VARIANTS[v] || VARIANTS.gray)

  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border',
      cls,
      className
    )}>
      {dot && (
        <span className={clsx(
          'w-1.5 h-1.5 rounded-full',
          cls.includes('green') ? 'bg-green-400' :
          cls.includes('red')   ? 'bg-red-400' :
          cls.includes('amber') ? 'bg-amber-400' :
          cls.includes('blue')  ? 'bg-blue-400' :
          'bg-gray-400'
        )} />
      )}
      {children}
    </span>
  )
}

// Named status badge
export function StatusBadge({ status }) {
  const labels = {
    active:     'Active',
    inactive:   'Inactive',
    suspended:  'Suspended',
    trial:      'Trial',
    locked:     'Locked',
    pending:    'Pending',
    paid:       'Paid',
    failed:     'Failed',
    delivered:  'Delivered',
    open:       'Open',
    in_progress:'In Progress',
    waiting:    'Waiting',
    resolved:   'Resolved',
    closed:     'Closed',
    connected:    'Connected',
    disconnected: 'Disconnected',
    paused:       'Paused',
    critical: 'Critical',
    high:     'High',
    medium:   'Medium',
    low:      'Low',
  }
  return <Badge variant={status} dot>{labels[status] || status}</Badge>
}

// Plan badge
export function PlanBadge({ plan }) {
  const map = {
    starter:    'gray',
    growth:     'info',
    business:   'purple',
    enterprise: 'amber',
  }
  const v = typeof plan === 'object' ? plan.id : plan?.toLowerCase()
  const label = typeof plan === 'object' ? plan.label : (plan?.charAt(0).toUpperCase() + plan?.slice(1))
  return <Badge variant={map[v] || 'gray'}>{label}</Badge>
}
