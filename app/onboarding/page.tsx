'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Role } from '@/lib/types'
import { Spinner } from '@/components/ui/Spinner'

const roles: { value: Role; label: string; desc: string; icon: string }[] = [
  { value: 'student', label: '生徒', desc: '探求テーマを持ち、有識者に話を聞きたい', icon: '📚' },
  { value: 'expert', label: '有識者', desc: '経験・知識を活かして生徒をサポートしたい', icon: '🎓' },
]

export default function OnboardingPage() {
  const [selected, setSelected] = useState<Role | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function submit() {
    if (!selected) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('セッションが切れました。再ログインしてください。'); setLoading(false); return }

    const { error: upsertErr } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'ユーザー',
      role: selected,
    })

    if (upsertErr) { setError('登録に失敗しました: ' + upsertErr.message); setLoading(false); return }

    const homeMap: Record<Role, string> = { student: '/student/home', expert: '/expert/home', admin: '/admin' }
    router.push(homeMap[selected])
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-blue-600 font-bold text-xl mb-2">QUEST</div>
          <h1 className="text-2xl font-bold text-gray-900">あなたは？</h1>
          <p className="text-gray-500 text-sm mt-2">ロールは後から変更できません</p>
        </div>

        <div className="space-y-3 mb-8">
          {roles.map(r => (
            <button
              key={r.value}
              onClick={() => setSelected(r.value)}
              className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                selected === r.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <span className="text-3xl">{r.icon}</span>
              <div>
                <div className="font-semibold text-gray-900">{r.label}</div>
                <div className="text-gray-500 text-sm mt-0.5">{r.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button
          onClick={submit}
          disabled={!selected || loading}
          className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <><Spinner size="sm" />登録中...</> : '始める'}
        </button>
      </div>
    </div>
  )
}
