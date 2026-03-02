interface BadgeProps {
  children: React.ReactNode
  variant?: 'blue' | 'green' | 'yellow' | 'red' | 'gray'
}

const variants = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-700',
}

export function Badge({ children, variant = 'blue' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    pending: { label: '承認待ち', variant: 'yellow' },
    accepted: { label: '承諾済み', variant: 'green' },
    declined: { label: '辞退', variant: 'red' },
    cancelled: { label: 'キャンセル', variant: 'gray' },
    scheduled: { label: '予定', variant: 'blue' },
    done: { label: '完了', variant: 'green' },
    free: { label: '空き', variant: 'green' },
    booked: { label: '予約済み', variant: 'gray' },
  }
  const cfg = map[status] ?? { label: status, variant: 'gray' as const }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
