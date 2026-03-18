import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'

const TOOLTIP_STYLE = {
  backgroundColor: '#1F2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  padding: '8px 12px',
}
const TOOLTIP_LABEL_STYLE = { color: '#9CA3AF', fontSize: 12, marginBottom: 4 }
const TOOLTIP_ITEM_STYLE  = { color: '#E5E7EB', fontSize: 12 }

const axisStyle = { fontSize: 11, fill: '#6B7280' }
const gridStyle = { stroke: '#1F2937', strokeDasharray: '3 3' }

// ─── Area Chart ───────────────────────────────────────────────────────────
export function AdminAreaChart({ data, dataKey, label, color = '#3B82F6', height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad_${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} {...gridStyle} />
        <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }}
        />
        <Area
          type="monotone"
          dataKey="value"
          name={label}
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad_${dataKey})`}
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: '#1F2937', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Multi-line Area Chart ────────────────────────────────────────────────
export function MultiAreaChart({ data, series, height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          {series.map(s => (
            <linearGradient key={s.key} id={`grad_m_${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={s.color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0}   />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} {...gridStyle} />
        <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          formatter={(v) => [`$${v.toLocaleString()}`, '']}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: '#9CA3AF', paddingTop: 8 }}
        />
        {series.map(s => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#grad_m_${s.key})`}
            dot={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Bar Chart ─────────────────────────────────────────────────────────────
export function AdminBarChart({ data, dataKey = 'value', nameKey = 'month', color = '#3B82F6', height = 200, formatter }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barSize={18}>
        <CartesianGrid vertical={false} {...gridStyle} />
        <XAxis dataKey={nameKey} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={formatter} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          formatter={formatter ? (v) => [formatter(v), ''] : undefined}
        />
        <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Multi-Bar Chart ────────────────────────────────────────────────────────
export function MultiBarChart({ data, series, height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barSize={14} barGap={2}>
        <CartesianGrid vertical={false} {...gridStyle} />
        <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          formatter={(v) => [`$${v.toLocaleString()}`, '']}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#9CA3AF', paddingTop: 8 }} />
        {series.map(s => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Donut Chart ────────────────────────────────────────────────────────────
export function DonutChart({ data, height = 200 }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          formatter={(v, name) => [`${v} (${((v/total)*100).toFixed(1)}%)`, name]}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Line Chart ──────────────────────────────────────────────────────────
export function AdminLineChart({ data, series, height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} {...gridStyle} />
        <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#9CA3AF', paddingTop: 8 }} />
        {series.map(s => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Realtime Gauge ────────────────────────────────────────────────────────
export function GaugeBar({ value, max = 100, color = '#3B82F6', label, suffix = '%' }) {
  const pct = Math.min((value / max) * 100, 100)
  const barColor = pct > 80 ? '#EF4444' : pct > 60 ? '#F59E0B' : color

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-200 font-semibold tabular-nums">{value}{suffix}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}
