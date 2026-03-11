import { Sidebar } from './Sidebar'
import { User } from '@/lib/types'

interface Props {
  user: User | null
  children: React.ReactNode
}

export function AppLayout({ user, children }: Props) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <main className="flex-1 ml-52 min-w-0">
        {children}
      </main>
    </div>
  )
}
