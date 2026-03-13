const COLORS = [
  'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
]

function colorFor(id: string) {
  let n = 0
  for (const c of id) n += c.charCodeAt(0)
  return COLORS[n % COLORS.length]
}

const SIZE = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-16 h-16 text-2xl',
  xl: 'w-20 h-20 text-3xl',
}

interface Props {
  user: { id: string; name: string; avatar_url?: string | null }
  size?: keyof typeof SIZE
  className?: string
}

export function Avatar({ user, size = 'md', className = '' }: Props) {
  const base = `${SIZE[size]} rounded-full shrink-0 object-cover`
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.name}
        className={`${base} ${className}`}
      />
    )
  }
  return (
    <div className={`${SIZE[size]} ${colorFor(user.id)} rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}>
      {user.name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}
