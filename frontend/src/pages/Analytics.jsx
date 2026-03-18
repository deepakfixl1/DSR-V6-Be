import { TrendingUp, Users, Activity, Globe, BarChart3, Calendar, Download } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { AdminAreaChart, AdminBarChart, DonutChart, MultiAreaChart } from '../components/charts/ChartWidgets'
import { activeUsersTimeline, apiCallsTimeline, revenueData, planDistribution, tenants } from '../data/mockData'
import { useApp } from '../context/AppContext'
import clsx from 'clsx'

// Geo distribution mock
const geoData = [
  { country: 'United States', users: 38240, pct: 42, flag: '🇺🇸' },
  { country: 'United Kingdom', users: 12100, pct: 13, flag: '🇬🇧' },
  { country: 'Germany',        users: 8900,  pct: 10, flag: '🇩🇪' },
  { country: 'India',          users: 7200,  pct: 8,  flag: '🇮🇳' },
  { country: 'Canada',         users: 5800,  pct: 6,  flag: '🇨🇦' },
  { country: 'Australia',      users: 4300,  pct: 5,  flag: '🇦🇺' },
  { country: 'France',         users: 3900,  pct: 4,  flag: '🇫🇷' },
  { country: 'Other',          users: 11000, pct: 12, flag: '🌍' },
]

const cohortRetention = [
  { month: 'Jan', m0: 100, m1: 82, m2: 71, m3: 65 },
  { month: 'Feb', m0: 100, m1: 79, m2: 68, m3: 62 },
  { month: 'Mar', m0: 100, m1: 85, m2: 74, m3: null },
  { month: 'Apr', m0: 100, m1: 88, m2: null, m3: null },
]

export default function Analytics() {
  const { addToast } = useApp()

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Cross-platform insights and growth analytics</p>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-md p-1">
            {['7d', '30d', '90d', '1y'].map(r => (
              <button key={r} className="px-2.5 py-1 text-xs rounded transition-colors text-gray-500 hover:text-gray-300 first:bg-gray-600 first:text-gray-100">{r}</button>
            ))}
          </div>
          <Button size="sm" variant="outline" icon={Download} onClick={() => addToast('Exporting analytics...', 'info')}>Export</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'DAU',         value: '3,847',  change: '+8.3%',  color: 'text-blue-400' },
          { label: 'WAU',         value: '18,293', change: '+12.1%', color: 'text-violet-400' },
          { label: 'MAU',         value: '64,821', change: '+6.4%',  color: 'text-green-400' },
          { label: 'Avg Session', value: '12m 43s', change: '+1m',   color: 'text-cyan-400' },
        ].map(s => (
          <div key={s.label} className="admin-card px-4 py-3">
            <div className="text-xs text-gray-400 mb-1">{s.label}</div>
            <div className={clsx('text-xl font-bold tabular-nums', s.color)}>{s.value}</div>
            <div className="text-xs text-green-400 mt-0.5">{s.change} vs prev period</div>
          </div>
        ))}
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card noPad>
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-100">User Activity (30d)</h3>
            <Users size={14} className="text-gray-500" />
          </div>
          <AdminAreaChart data={activeUsersTimeline} dataKey="users" label="Active Users" color="#3B82F6" height={180} />
        </Card>
        <Card noPad>
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-100">API Usage (30d)</h3>
            <Activity size={14} className="text-gray-500" />
          </div>
          <AdminAreaChart data={apiCallsTimeline} dataKey="api" label="API Calls" color="#8B5CF6" height={180} />
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Geo */}
        <Card title="Geographic Distribution" className="lg:col-span-1">
          <div className="space-y-2.5">
            {geoData.map(g => (
              <div key={g.country}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5"><span>{g.flag}</span><span className="text-gray-300">{g.country}</span></span>
                  <span className="text-gray-400 tabular-nums">{g.users.toLocaleString()} ({g.pct}%)</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${g.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Cohort Retention */}
        <Card title="Cohort Retention" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-500">Cohort</th>
                  <th className="text-center py-2 text-gray-500">Month 0</th>
                  <th className="text-center py-2 text-gray-500">Month 1</th>
                  <th className="text-center py-2 text-gray-500">Month 2</th>
                  <th className="text-center py-2 text-gray-500">Month 3</th>
                </tr>
              </thead>
              <tbody>
                {cohortRetention.map(row => (
                  <tr key={row.month} className="border-b border-gray-700/40">
                    <td className="py-2.5 text-gray-300 font-medium">{row.month}</td>
                    {[row.m0, row.m1, row.m2, row.m3].map((v, i) => (
                      <td key={i} className="text-center py-2.5">
                        {v !== null ? (
                          <div className={clsx(
                            'inline-flex items-center justify-center w-12 h-7 rounded text-xs font-semibold',
                            v >= 80 ? 'bg-green-500/20 text-green-400' :
                            v >= 65 ? 'bg-blue-500/20 text-blue-400' :
                            v >= 50 ? 'bg-amber-500/20 text-amber-400' :
                                      'bg-red-500/20 text-red-400'
                          )}>
                            {v}%
                          </div>
                        ) : (
                          <span className="text-gray-700">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-600 mt-3">Average 30-day retention: <span className="text-gray-400">81.5%</span></p>
        </Card>
      </div>

      {/* Row 3: Revenue trend */}
      <Card noPad>
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-100">Revenue vs Churn (12 months)</h3>
          <TrendingUp size={14} className="text-gray-500" />
        </div>
        <MultiAreaChart
          data={revenueData}
          series={[
            { key: 'mrr',   label: 'MRR',   color: '#10B981' },
            { key: 'churn', label: 'Churn', color: '#EF4444' },
          ]}
          height={200}
        />
      </Card>

      {/* Row 4: Reports stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Plan Distribution">
          <DonutChart data={planDistribution} height={180} />
          <div className="mt-3 space-y-1.5">
            {planDistribution.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-gray-400">{d.name}</span>
                </div>
                <span className="text-gray-200 font-semibold">{d.value} tenants</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Feature Adoption">
          <div className="space-y-3">
            {[
              { feature: 'DSR Reporting',       pct: 94, users: 85200 },
              { feature: 'WSR Reporting',        pct: 78, users: 70800 },
              { feature: 'AI Summary',           pct: 61, users: 55400 },
              { feature: 'Team Dashboard',       pct: 48, users: 43600 },
              { feature: 'Custom Reports',       pct: 34, users: 30900 },
              { feature: 'API Integration',      pct: 22, users: 20000 },
              { feature: 'Workflow Automation',  pct: 11, users: 10000 },
            ].map(f => (
              <div key={f.feature}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-300">{f.feature}</span>
                  <span className="text-gray-400">{f.users.toLocaleString()} users · {f.pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${f.pct}%`, backgroundColor: f.pct > 70 ? '#10B981' : f.pct > 40 ? '#3B82F6' : '#6B7280' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
