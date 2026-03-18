import { useState } from 'react'
import { DollarSign, TrendingDown, CreditCard, AlertCircle, Download, RefreshCw, Filter, Search, ArrowUpRight } from 'lucide-react'
import { invoices, revenueData, revenueByPlan, churnData, failedPaymentsData } from '../data/mockData'
import { StatusBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { AdminBarChart, MultiAreaChart, DonutChart } from '../components/charts/ChartWidgets'
import { useApp } from '../context/AppContext'
import { format } from 'date-fns'
import clsx from 'clsx'

const planColors = { Enterprise: '#F59E0B', Business: '#8B5CF6', Growth: '#3B82F6', Starter: '#6B7280' }

export default function Billing() {
  const { addToast } = useApp()
  const [tab, setTab] = useState('Overview')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatus] = useState('all')

  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false
    if (search && !inv.tenant.toLowerCase().includes(search.toLowerCase()) && !inv.id.includes(search)) return false
    return true
  })

  const totalMRR = revenueData[revenueData.length - 1].mrr
  const failedCount = invoices.filter(i => i.status === 'failed').length
  const pendingCount = invoices.filter(i => i.status === 'pending').length

  return (
    <div className="space-y-5 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Monthly Revenue',  value: `$${(totalMRR/1000).toFixed(0)}K`, sub: '+6.4% vs last month', color: 'text-green-400', icon: DollarSign },
          { label: 'Annual Revenue',   value: `$${(totalMRR * 12 / 1000000).toFixed(1)}M`, sub: 'ARR', color: 'text-emerald-400', icon: TrendingDown },
          { label: 'Failed Payments',  value: failedCount, sub: 'Requires attention', color: 'text-red-400', icon: AlertCircle },
          { label: 'Pending Invoices', value: pendingCount, sub: 'Awaiting payment', color: 'text-amber-400', icon: CreditCard },
        ].map(s => (
          <div key={s.label} className="admin-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={14} className={s.color} />
              <span className="text-xs text-gray-400">{s.label}</span>
            </div>
            <div className={clsx('text-2xl font-bold tabular-nums', s.color)}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex gap-0">
          {['Overview', 'Invoices', 'By Plan'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={clsx('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors', tab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Overview' && (
        <div className="space-y-5">
          {/* Revenue chart */}
          <Card noPad>
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-100">Revenue Overview</h3>
                <p className="text-xs text-gray-500 mt-0.5">MRR vs Churn over 12 months</p>
              </div>
              <Button size="sm" variant="outline" icon={Download} onClick={() => addToast('Downloading report...', 'info')}>Export</Button>
            </div>
            <MultiAreaChart
              data={revenueData}
              series={[
                { key: 'mrr',   label: 'MRR',   color: '#10B981' },
                { key: 'churn', label: 'Churn', color: '#EF4444' },
              ]}
              height={220}
            />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Churn */}
            <Card noPad>
              <div className="px-5 pt-5 pb-3">
                <h3 className="text-sm font-semibold text-gray-100">Churn Rate</h3>
              </div>
              <AdminBarChart data={churnData} dataKey="value" nameKey="month" color="#EF4444" height={160} />
            </Card>

            {/* Revenue by plan */}
            <Card title="Revenue by Plan">
              <div className="space-y-3">
                {revenueByPlan.map(p => (
                  <div key={p.plan}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-300 font-medium">{p.plan}</span>
                      <span className="text-gray-100 font-semibold">${p.revenue.toLocaleString()}/yr · {p.tenants} tenants</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${(p.revenue / Math.max(...revenueByPlan.map(x => x.revenue))) * 100}%`,
                        backgroundColor: planColors[p.plan]
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'Invoices' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input className="admin-input pl-9" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="admin-select w-36" value={statusFilter} onChange={e => setStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <Button size="sm" variant="outline" icon={Download} onClick={() => addToast('Exporting invoices...', 'info')}>Export CSV</Button>
          </div>

          <Card noPad>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Tenant</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.slice(0, 20).map(inv => (
                  <tr key={inv.id} className={clsx(inv.status === 'failed' && 'bg-red-500/5')}>
                    <td><span className="font-mono text-xs text-gray-400">{inv.id}</span></td>
                    <td><span className="font-medium text-gray-200">{inv.tenant}</span></td>
                    <td><span className="text-xs text-violet-400">{inv.plan}</span></td>
                    <td><span className="font-semibold text-gray-100">${inv.amount}</span></td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td><span className="text-xs text-gray-400">{format(new Date(inv.date), 'MMM d, yyyy')}</span></td>
                    <td>
                      {inv.status === 'failed' && (
                        <Button size="xs" variant="danger" onClick={() => addToast(`Retrying payment for ${inv.tenant}...`, 'warning')}>
                          Retry
                        </Button>
                      )}
                      {inv.status === 'paid' && (
                        <Button size="xs" variant="ghost" onClick={() => addToast('Refund modal', 'info')}>Refund</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {tab === 'By Plan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card title="Plan Distribution (Revenue)">
            <DonutChart
              data={revenueByPlan.map(p => ({ name: p.plan, value: p.revenue, fill: planColors[p.plan] }))}
              height={220}
            />
            <div className="mt-3 space-y-2">
              {revenueByPlan.map(p => (
                <div key={p.plan} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: planColors[p.plan] }} />
                    <span className="text-gray-400">{p.plan}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-300">{p.tenants} tenants</span>
                    <span className="text-gray-100 font-semibold">${p.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Plan Metrics">
            <div className="space-y-4">
              {revenueByPlan.map(p => (
                <div key={p.plan} className="p-3 rounded-lg bg-gray-700/30 border border-gray-700/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-100">{p.plan}</span>
                    <span className="text-sm font-bold text-green-400">${p.revenue.toLocaleString()}/yr</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{p.tenants} tenants</span>
                    <span>${Math.round(p.revenue / p.tenants / 12)}/tenant/mo</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
