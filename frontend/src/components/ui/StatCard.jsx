import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import clsx from 'clsx'

function Sparkline({ data, color = '#3B82F6' }) {
  if (!data?.length) return null
  const vals = data.map(d => d.value || d)
  const min  = Math.min(...vals)
  const max  = Math.max(...vals)
  const range = max - min || 1
  const w = 80, h = 32
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" points={pts} />
    </svg>
  )
}

export default function StatCard({ title, value, change, trend, icon: Icon, iconColor, sparkData, format: fmt, subtitle }) {
  const formatted = typeof value === 'number'
    ? fmt === 'currency'  ? `$${(value / 1000).toFixed(0)}K`
    : fmt === 'currency_full' ? `$${value.toLocaleString()}`
    : fmt === 'percent'   ? `${value}%`
    : fmt === 'largenum'  ? value > 999999 ? `${(value/1000000).toFixed(1)}M` : value > 999 ? `${(value/1000).toFixed(1)}K` : value.toLocaleString()
    : value.toLocaleString()
    : value

  const isUp   = trend === 'up'   || change > 0
  const isDown = trend === 'down' || change < 0

  const sparkColor = isDown ? '#EF4444' : '#3B82F6'

  return (
    <div className="admin-card p-5 flex flex-col gap-3 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', iconColor || 'bg-blue-500/15')}>
              <Icon size={15} className={iconColor ? 'text-white' : 'text-blue-400'} />
            </div>
          )}
          <span className="text-xs font-medium text-gray-400">{title}</span>
        </div>
        {sparkData && <Sparkline data={sparkData} color={sparkColor} />}
      </div>

      <div>
        <div className="text-2xl font-bold text-gray-100 tabular-nums count-up">{formatted}</div>
        {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          {isUp   ? <TrendingUp  size={12} className="text-green-400 shrink-0" /> :
           isDown ? <TrendingDown size={12} className="text-red-400   shrink-0" /> :
                    <Minus       size={12} className="text-gray-500  shrink-0" />}
          <span className={clsx(
            'text-xs font-semibold',
            isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-gray-500'
          )}>
            {change > 0 ? '+' : ''}{change}%
          </span>
          <span className="text-xs text-gray-500">vs last month</span>
        </div>
      )}
    </div>
  )
}
