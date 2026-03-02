'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type Tab = 'signin' | 'signup'

const ROLE_HOME: Record<string, string> = {
  student: '/student/home',
  expert: '/expert/home',
  admin: '/admin',
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function LoginContent() {
  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')
  const router = useRouter()
  const supabase = createClient()

  function resetForm() {
    setError('')
    setMessage('')
  }

  async function handleSignIn() {
    if (!email || !password) { setError('メールとパスワードを入力してください'); return }
    setLoading(true)
    setError('')
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single()
    router.push(profile ? (ROLE_HOME[profile.role] ?? '/') : '/onboarding')
  }

  async function handleSignUp() {
    if (!email || !password) { setError('メールとパスワードを入力してください'); return }
    if (password.length < 8) { setError('パスワードは8文字以上で入力してください'); return }
    setLoading(true)
    setError('')
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      setError('登録に失敗しました: ' + signUpError.message)
      setLoading(false)
      return
    }
    if (data.session) {
      router.push('/onboarding')
    } else {
      setMessage('確認メールを送信しました。メールをご確認の上、リンクをクリックしてください。')
      setLoading(false)
    }
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  async function signInAsGuest() {
    setLoading(true)
    setError('')
    const { data, error: guestError } = await supabase.auth.signInAnonymously()
    if (guestError || !data.user) {
      setError('ゲストログインに失敗しました。しばらくしてから再度お試しください。')
      setLoading(false)
      return
    }
    await supabase.from('users').upsert({
      id: data.user.id,
      email: `guest_${data.user.id}@quest.local`,
      name: 'ゲスト',
      role: 'student',
    })
    router.push('/student/home')
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const primaryBtn = 'w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3 font-medium transition-colors disabled:opacity-50'
  const secondaryBtn = 'w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-blue-600 font-bold text-2xl mb-1">QUEST</div>
          <p className="text-gray-500 text-sm">探求×有識者プラットフォーム</p>
        </div>

        {(urlError || error) && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {error || 'ログインに失敗しました。もう一度お試しください。'}
          </div>
        )}
        {!error && message && (
          <div className="bg-blue-50 text-blue-700 text-sm rounded-lg px-4 py-3 mb-4">
            {message}
          </div>
        )}

        {/* タブ */}
        <div className="flex mb-5 bg-gray-100 rounded-xl p-1">
          {(['signin', 'signup'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); resetForm() }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'signin' ? 'ログイン' : '新規登録'}
            </button>
          ))}
        </div>

        {/* メール/パスワードフォーム */}
        <div className="space-y-3 mb-4">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            disabled={loading}
          />
          <input
            type="password"
            placeholder={tab === 'signup' ? 'パスワード（8文字以上）' : 'パスワード'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (tab === 'signin' ? handleSignIn() : handleSignUp())}
            className={inputClass}
            disabled={loading}
          />
          <button
            onClick={tab === 'signin' ? handleSignIn : handleSignUp}
            disabled={loading}
            className={primaryBtn}
          >
            {loading ? '処理中...' : tab === 'signin' ? 'ログイン' : 'アカウント作成'}
          </button>
        </div>

        {/* 区切り */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-xs">または</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* OAuthとゲスト */}
        <div className="space-y-3">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className={secondaryBtn}
          >
            <GoogleIcon />
            Googleでログイン
          </button>
          <button
            onClick={signInAsGuest}
            disabled={loading}
            className={secondaryBtn}
          >
            <span className="text-lg">👤</span>
            ゲストとして体験する
          </button>
        </div>

        <p className="text-gray-400 text-xs mt-6 text-center leading-relaxed">
          ログインすることで利用規約および<br />プライバシーポリシーに同意します
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginContent />
    </Suspense>
  )
}
