'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/lib/types'

interface Props {
  user: User | null
}

export function Header({ user }: Props) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function getHomeLink() {
    if (!user) return '/'
    if (user.role === 'student') return '/student/home'
    if (user.role === 'expert') return '/expert/home'
    if (user.role === 'admin') return '/admin'
    return '/'
  }

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={getHomeLink()} className="flex items-center gap-2">
          <span className="text-blue-600 font-bold text-xl">QUEST</span>
          <span className="text-gray-400 text-xs hidden sm:block">探求×有識者プラットフォーム</span>
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              {user.role === 'student' && (
                <>
                  <Link href="/experts" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">有識者を探す</Link>
                  <Link href="/question/new" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">問いを作る</Link>
                </>
              )}
              {user.role === 'expert' && (
                <>
                  <Link href="/expert/inbox" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">受信箱</Link>
                  <Link href="/expert/availability" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">空き枠</Link>
                </>
              )}
              {user.role === 'admin' && (
                <Link href="/admin" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">管理画面</Link>
              )}
              <Link href="/profile" className="text-sm text-gray-600 hover:text-blue-600 transition-colors truncate max-w-24">{user.name}</Link>
              <button
                onClick={signOut}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ログアウト
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
