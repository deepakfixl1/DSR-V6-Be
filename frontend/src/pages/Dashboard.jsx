import { useState, useEffect } from 'react'
import { Building2, Users, DollarSign, TrendingUp, Activity, Cpu, Wifi, Clock, AlertTriangle, ArrowUpRight, RefreshCw, Database, Zap, Globe, Server, MemoryStick } from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import {
  AdminAreaChart, MultiBarChart, DonutChart, GaugeBar, AdminBarChart
} from '../components/charts/ChartWidgets'
import {
  dashboardKPIs, realtimeMetrics, revenueData,
  planDistribution, activeUsersTimeline, apiCallsTimeline,
  tenantGrowthData, tenants, securityEvents
} from '../data/mockData'
import { format } from 'date-fns'

function RealtimeMetric({ label, value, unit, icon: Icon, color = 'text-blue-400', pulse }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-700/40 last:border-0">
      <div className="flex items-center gap-2.5 text-gray-400 text-xs">
        <Icon size={13} className={color} />
        {label}
      </div>
      <div className="flex items-center gap-2">
        {pulse && (
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
          </span>
        )}
        <span className="text-sm font-semibold text-gray-100 tabular-nums">{value}<span className="text-xs text-gray-500 ml-1">{unit}</span></span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false)
  const [liveMetrics, setLiveMetrics] = useState(realtimeMetrics)

  // Simulate live updates
  useEffect(() => {
    const iv = setInterval(() => {
      setLiveMetrics(prev => ({
        ...prev,
        apiCallsPerMin: prev.apiCallsPerMin + Math.floor((Math.random() - 0.5) * 200),
        wsConnections: prev.wsConnections + Math.floor((Math.random() - 0.5) * 50),
        queueDepth: Math.max(0, prev.queueDepth + Math.floor((Math.random() - 0.5) * 30)),
        cpuUsage: Math.min(100, Math.max(5, prev.cpuUsage + (Math.random() - 0.5) * 5)),
      }))
    }, 3000)
    return () => clearInterval(iv)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1200)
  }

  const kpis = [
    {
      title: 'Total Tenants',
      value: dashboardKPIs.totalTenants.value,
      change: dashboardKPIs.totalTenants.change,
      icon: Building2,
      iconColor: 'bg-blue-500/15',
      sparkData: tenantGrowthData,
    },
    {
      title: 'Total Users',
      value: dashboardKPIs.totalUsers.value,
      change: dashboardKPIs.totalUsers.change,
      icon: Users,
      iconColor: 'bg-violet-500/15',
      fmt: 'largenum',
      sparkData: activeUsersTimeline.slice(-12),
    },
    {
      title: 'Monthly Revenue',
      value: dashboardKPIs.mrr.value,
      change: dashboardKPIs.mrr.change,
      icon: DollarSign,
      iconColor: 'bg-green-500/15',
      fmt: 'currency',
      sparkData: revenueData.map(d => ({ value: d.mrr })),
    },
    {
      title: 'Annual Revenue',
      value: dashboardKPIs.arr.value,
      change: dashboardKPIs.arr.change,
      icon: TrendingUp,
      iconColor: 'bg-emerald-500/15',
      fmt: 'currency',
      sparkData: revenueData.map(d => ({ value: d.arr })),
    },
    {
      title: 'Active Subscriptions',
      value: dashboardKPIs.activeSubscriptions.value,
      change: dashboardKPIs.activeSubscriptions.change,
      icon: Activity,
      iconColor: 'bg-cyan-500/15',
      sparkData: null,
    },
    {
      title: 'Platform Health',
      value: dashboardKPIs.platformHealth.value,
      change: dashboardKPIs.platformHealth.change,
      icon: Cpu,
      iconColor: 'bg-green-500/15',
      fmt: 'percent',
      sparkData: null,
    },
  ]

  const recentTenants = tenants.slice(0, 5)
  const recentAlerts  = securityEvents.filter(e => e.severity === 'critical' || e.severity === 'high').slice(0, 4)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-100">Control Tower</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · Real-time platform overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            All Systems Operational
          </div>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={handleRefresh} loading={refreshing}>
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <StatCard key={kpi.title} {...kpi} />
        ))}
      </div>

      {/* Row 2: Active Users + API Calls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card noPad className="overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-gray-100">Active Users</h3>
              <div className="flex gap-1">
                {['24h', '7d', '30d'].map(r => (
                  <span key={r} className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded cursor-pointer hover:bg-gray-600">
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-baseline gap-4 mb-4">
              {Object.entries(liveMetrics.activeUsers).map(([period, val]) => (
                <div key={period}>
                  <span className="text-lg font-bold text-gray-100 tabular-nums">{val.toLocaleString()}</span>
                  <span className="text-xs text-gray-500 ml-1">{period}</span>
                </div>
              ))}
            </div>
          </div>
          <AdminAreaChart data={activeUsersTimeline} dataKey="users" label="Active Users" color="#3B82F6" height={160} />
        </Card>

        <Card noPad className="overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-gray-100">API Throughput</h3>
              <span className="flex items-center gap-1.5 text-xs text-blue-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                </span>
                Live
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-lg font-bold text-gray-100 tabular-nums">{liveMetrics.apiCallsPerMin.toLocaleString()}</span>
              <span className="text-xs text-gray-500">calls/min</span>
            </div>
          </div>
          <AdminAreaChart data={apiCallsTimeline} dataKey="api" label="API Calls" color="#8B5CF6" height={160} />
        </Card>
      </div>

      {/* Row 3: Revenue + Plan Distribution + System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Revenue */}
        <Card noPad className="lg:col-span-5 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-100">Revenue Trend</h3>
              <span className="text-xs text-gray-500">Last 12 months</span>
            </div>
          </div>
          <MultiBarChart
            data={revenueData}
            series={[
              { key: 'mrr', label: 'MRR', color: '#3B82F6' },
              { key: 'churn', label: 'Churn', color: '#EF4444' },
            ]}
            height={200}
          />
        </Card>

        {/* Plan Distribution */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-100">Plan Distribution</h3>
          </div>
          <DonutChart data={planDistribution} height={160} />
          <div className="mt-3 space-y-1.5">
            {planDistribution.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                  <span className="text-gray-400">{d.name}</span>
                </div>
                <span className="text-gray-200 font-semibold tabular-nums">{d.value} tenants</span>
              </div>
            ))}
          </div>
        </Card>

        {/* System Health */}
        <Card className="lg:col-span-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-100">System Health</h3>
            <span className="text-xs text-green-400 font-medium">Healthy</span>
          </div>
          <div className="space-y-4">
            <GaugeBar value={Math.round(liveMetrics.cpuUsage)} label="CPU Usage" color="#3B82F6" />
            <GaugeBar value={liveMetrics.memoryUsage} label="Memory Usage" color="#8B5CF6" />
            <GaugeBar value={48} label="Disk I/O" color="#10B981" />
          </div>
          <div className="mt-5 space-y-0">
            <RealtimeMetric label="API Calls/min"     value={liveMetrics.apiCallsPerMin.toLocaleString()} icon={Zap}    color="text-blue-400"   pulse />
            <RealtimeMetric label="WS Connections"    value={liveMetrics.wsConnections.toLocaleString()}  icon={Wifi}   color="text-green-400"  pulse />
            <RealtimeMetric label="Queue Depth"       value={liveMetrics.queueDepth}                       icon={Server} color="text-amber-400"  />
            <RealtimeMetric label="p95 Latency"       value={liveMetrics.p95Latency} unit="ms"              icon={Clock}  color="text-violet-400" />
            <RealtimeMetric label="Error Rate"        value={liveMetrics.errorRate} unit="%"                icon={AlertTriangle} color="text-red-400" />
          </div>
        </Card>
      </div>

      {/* Row 4: Recent Tenants + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Tenants */}
        <Card noPad>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-100">Recent Tenants</h3>
            <a href="/tenants" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ArrowUpRight size={11} />
            </a>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {recentTenants.map(t => (
                <tr key={t.id}>
                  <td>
                    <div className="font-medium text-gray-100">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.slug}</div>
                  </td>
                  <td>
                    <span className="text-xs font-medium text-violet-400">{t.plan.label}</span>
                  </td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>
                    <span className="text-green-400 font-semibold">${t.revenue}/mo</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Security Alerts */}
        <Card noPad>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
              Security Alerts
              <span className="w-5 h-5 bg-red-500/20 text-red-400 text-xs font-bold rounded-full flex items-center justify-center">
                {recentAlerts.length}
              </span>
            </h3>
            <a href="/security" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ArrowUpRight size={11} />
            </a>
          </div>
          <div className="divide-y divide-gray-700/40">
            {recentAlerts.map(alert => (
              <div key={alert.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-700/20 transition-colors">
                <div className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${
                  alert.severity === 'critical' ? 'bg-red-400' : 'bg-amber-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200 truncate">{alert.type}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{alert.user} · {alert.ip}</div>
                </div>
                <StatusBadge status={alert.severity} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 5: Quick Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Reports Today',    value: '1,284', icon: Database, color: 'text-blue-400' },
          { label: 'DSR Submitted',    value: '847',   icon: Activity,  color: 'text-green-400' },
          { label: 'WSR Pending',      value: '23',    icon: Clock,     color: 'text-amber-400' },
          { label: 'API Keys Active',  value: '312',   icon: Zap,       color: 'text-violet-400' },
        ].map(s => (
          <div key={s.label} className="admin-card p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center shrink-0">
              <s.icon size={14} className={s.color} />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-100 tabular-nums">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
