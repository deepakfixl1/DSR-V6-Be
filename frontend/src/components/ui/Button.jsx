import clsx from 'clsx'

const VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white border-transparent shadow-sm',
  danger:  'bg-red-600 hover:bg-red-500 text-white border-transparent shadow-sm',
  ghost:   'bg-transparent hover:bg-gray-700 text-gray-300 hover:text-gray-100 border-transparent',
  outline: 'bg-transparent hover:bg-gray-700/50 text-gray-300 hover:text-gray-100 border-gray-600 hover:border-gray-500',
  success: 'bg-green-600 hover:bg-green-500 text-white border-transparent shadow-sm',
  secondary:'bg-gray-700 hover:bg-gray-600 text-gray-200 border-transparent',
}

const SIZES = {
  xs: 'px-2 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className,
  loading = false,
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-md border transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
        VARIANTS[variant],
        SIZES[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : Icon ? (
        <Icon size={14} />
      ) : null}
      {children}
      {IconRight && !loading && <IconRight size={14} />}
    </button>
  )
}
