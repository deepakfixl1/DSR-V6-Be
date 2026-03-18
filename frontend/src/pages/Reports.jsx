import { useState } from 'react'
import { BarChart3, Plus, Download, Clock, Play, Pause, Trash2, Eye, Calendar, Filter, RefreshCw, FileText } from 'lucide-react'
import { reportTemplates } from '../data/mockData'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { format } from 'date-fns'
import clsx from 'clsx'

const CHART_TYPES = ['Bar Chart', 'Line Chart', 'Area Chart', 'Donut Chart', 'Table', 'Metric Card']
const DATA_SOURCES = ['Tenants', 'Users', 'Revenue', 'API Usage', 'Security Events', 'Audit Logs', 'Support Tickets', 'Reports Submitted']

function ReportCard({ report, onRun, onDelete }) {
  return (
    <div className="admin-card p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <BarChart3 size={14} className="text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-100">{report.name}</div>
            <div className="text-xs text-gray-500 capitalize mt-0.5">{report.type === 'scheduled' ? '📅 Scheduled' : '▶ Manual'}</div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="xs" variant="ghost" icon={Play} onClick={() => onRun(report)}>Run</Button>
          <Button size="xs" variant="ghost" icon={Download}>Export</Button>
          <Button size="xs" variant="ghost" icon={Trash2} onClick={() => onDelete(report.id)} />
        </div>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-gray-500">
          <span>Last run</span>
          <span className="text-gray-400">{format(new Date(report.last_run), 'MMM d, HH:mm')}</span>
        </div>
        {report.schedule && (
          <div className="flex items-center gap-1.5 text-amber-400">
            <Clock size={10} />
            <span>{report.schedule}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Reports() {
  const { addToast } = useApp()
  const [reports, setReports] = useState(reportTemplates)
  const [showBuilder, setShowBuilder] = useState(false)
  const [builderWidgets, setBuilderWidgets] = useState([])
  const [selectedSource, setSelectedSource] = useState(DATA_SOURCES[0])
  const [selectedChart, setSelectedChart] = useState(CHART_TYPES[0])

  const handleRun = (report) => {
    addToast(`Running "${report.name}"...`, 'info')
    setTimeout(() => addToast(`"${report.name}" completed. Export ready.`, 'success'), 1500)
  }

  const handleDelete = (id) => {
    setReports(prev => prev.filter(r => r.id !== id))
    addToast('Report template deleted', 'success')
  }

  const addWidget = () => {
    setBuilderWidgets(prev => [...prev, { id: Date.now(), source: selectedSource, chart: selectedChart }])
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Build, schedule, and export reports</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" icon={Download} onClick={() => addToast('Bulk export started...', 'info')}>Bulk Export</Button>
          <Button size="sm" icon={Plus} onClick={() => setShowBuilder(true)}>New Report</Button>
        </div>
      </div>

      {/* Quick export cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'DSR Summary',        icon: FileText, color: 'text-blue-400',   bg: 'bg-blue-500/10' },
          { label: 'WSR Summary',        icon: Calendar, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Revenue Report',     icon: BarChart3, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Security Digest',    icon: Filter,   color: 'text-red-400',    bg: 'bg-red-500/10' },
        ].map(q => (
          <button key={q.label} onClick={() => addToast(`Generating ${q.label}...`, 'info')} className="admin-card p-4 flex items-center gap-3 hover:border-gray-600 transition-colors text-left">
            <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', q.bg)}>
              <q.icon size={15} className={q.color} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-100">{q.label}</div>
              <div className="text-xs text-gray-500">Quick export</div>
            </div>
          </button>
        ))}
      </div>

      {/* Report Templates */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Report Templates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map(r => <ReportCard key={r.id} report={r} onRun={handleRun} onDelete={handleDelete} />)}
          <button
            onClick={() => setShowBuilder(true)}
            className="admin-card p-4 border-dashed flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors min-h-24"
          >
            <Plus size={20} />
            <span className="text-sm">Create New Template</span>
          </button>
        </div>
      </div>

      {/* Report Builder Modal */}
      <Modal open={showBuilder} onClose={() => setShowBuilder(false)} title="Report Builder" size="xl">
        <div className="flex gap-4 h-96">
          {/* Left: Data Sources */}
          <div className="w-44 shrink-0">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Data Sources</div>
            <div className="space-y-1">
              {DATA_SOURCES.map(src => (
                <button key={src} onClick={() => setSelectedSource(src)} className={clsx('flex items-center gap-2 w-full px-2.5 py-2 rounded text-xs transition-colors', selectedSource === src ? 'bg-blue-500/15 text-blue-400' : 'text-gray-400 hover:bg-gray-700/50')}>
                  <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                  {src}
                </button>
              ))}
            </div>
          </div>

          {/* Middle: Canvas */}
          <div className="flex-1 bg-gray-900/60 rounded-lg border border-gray-700 border-dashed p-4 overflow-y-auto">
            <div className="text-xs text-gray-600 text-center mb-4">Drop components here to build your report</div>
            {builderWidgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <BarChart3 size={32} className="mb-2 opacity-40" />
                <p className="text-sm">Add components from the right panel</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {builderWidgets.map(w => (
                  <div key={w.id} className="admin-card p-3">
                    <div className="text-xs font-medium text-gray-300">{w.chart}</div>
                    <div className="text-xs text-gray-500">Source: {w.source}</div>
                    <div className="mt-2 h-20 bg-gray-700/40 rounded flex items-center justify-center">
                      <BarChart3 size={20} className="text-gray-600" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Component Panel */}
          <div className="w-44 shrink-0">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Chart Type</div>
            <div className="space-y-1 mb-4">
              {CHART_TYPES.map(ct => (
                <button key={ct} onClick={() => setSelectedChart(ct)} className={clsx('flex items-center gap-2 w-full px-2.5 py-1.5 rounded text-xs transition-colors', selectedChart === ct ? 'bg-violet-500/15 text-violet-400' : 'text-gray-400 hover:bg-gray-700/50')}>
                  {ct}
                </button>
              ))}
            </div>
            <Button size="sm" variant="primary" className="w-full" onClick={addWidget}>
              + Add Component
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" icon={Clock}>Schedule</Button>
            <Button size="sm" variant="ghost" icon={Download}>Export Now</Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowBuilder(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { addToast('Report template saved!', 'success'); setShowBuilder(false) }}>Save Template</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
