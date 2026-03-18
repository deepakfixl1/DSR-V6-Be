import clsx from 'clsx'

export default function Card({ children, className, noPad = false, title, action }) {
  return (
    <div className={clsx('admin-card', !noPad && 'p-5', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-sm font-semibold text-gray-100">{title}</h3>}
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return (
    <div className={clsx('px-5 py-4 border-b border-gray-700', className)}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }) {
  return (
    <div className={clsx('p-5', className)}>
      {children}
    </div>
  )
}
