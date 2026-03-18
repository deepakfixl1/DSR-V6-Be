import clsx from 'clsx'

export function Skeleton({ className }) {
  return <div className={clsx('animate-pulse bg-gray-700/60 rounded', className)} />
}

export function SkeletonCard() {
  return (
    <div className="admin-card p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <tr className="border-b border-gray-700/40">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonTable({ rows = 8 }) {
  return (
    <div className="admin-card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <Skeleton className="h-5 w-32" />
      </div>
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
        </tbody>
      </table>
    </div>
  )
}
