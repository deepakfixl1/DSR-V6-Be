import { useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import Button from './Button'
import clsx from 'clsx'

export default function Modal({ open, onClose, title, children, size = 'md', className }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handle = (e) => { if (e.key === 'Escape') onClose?.() }
    if (open) window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [open, onClose])

  if (!open) return null

  const maxWidths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 cmd-palette-overlay" onClick={onClose}>
      <div
        className={clsx('relative w-full bg-gray-800 border border-gray-700 rounded-xl shadow-modal animate-slide-up', maxWidths[size], className)}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-base font-semibold text-gray-100">{title}</h2>
          <button onClick={onClose} className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex gap-3 mb-5">
        <div className={clsx('shrink-0 w-10 h-10 rounded-full flex items-center justify-center', danger ? 'bg-red-500/15' : 'bg-amber-500/15')}>
          <AlertTriangle size={18} className={danger ? 'text-red-400' : 'text-amber-400'} />
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{message}</p>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm?.(); onClose?.() }}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
