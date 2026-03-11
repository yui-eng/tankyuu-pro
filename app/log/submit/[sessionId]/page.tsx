'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageSpinner, Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'

export default function LogSubmitPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [existingLog, setExistingLog] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [reframe, setReframe] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [referral, setReferral] = useState('')
  const [executed48h, setExecuted48h] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }
      const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
      setUser(userData)

      const { data: sess, error: se } = await supabase
        .from('sessions')
        .select('*, requests(*, questions(title))')
        .eq('id', sessionId)
        .single()
      if (se || !sess) { setError('セッションが見つかりません'); setLoading(false); return }
      setSession(sess)

      const { data: log } = await supabase.from('three_line_logs').select('*').eq('session_id', sessionId).single()
      if (log) {
        setExistingLog(log)
        setReframe(log.reframe); setNextStep(log.next_step_48h); setReferral(log.referral_wish ?? ''); setExecuted48h(log.executed_48h)
      }
      setLoading(false)
    }
    load()
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (!reframe || !nextStep) { setError('必須項目を入力してください'); return }
    setSaving(true)
    const { error: e } = await supabase.from('three_line_logs').upsert({
      session_id: sessionId,
      submitted_by_student_id: user.id,
      reframe,
      next_step_48h: nextStep,
      referral_wish: referral || null,
      executed_48h: executed48h,
      submitted_at: new Date().toISOString(),
    })
    if (e) { setError('保存に失敗しました: ' + e.message); setSaving(false); return }
    await supabase.from('sessions').update({ status: 'done' }).eq('id', sessionId)
    router.push('/student/home')
  }

  if (loading) return <AppLayout user={null}><PageSpinner /></AppLayout>
  if (error && !session) return <AppLayout user={user}><ErrorState message={error} /></AppLayout>

  const question = session?.requests?.questions
  const isSubmitted = !!existingLog?.submitted_at

  return (
    <AppLayout user={user}>
      <div className="max-w-xl mx-auto px-4 py-10">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1">
          ← 戻る
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">3行ログ</h1>
        {question && <p className="text-gray-500 text-sm mb-8">問い：{question.title}</p>}

        {isSubmitted && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-green-800 text-sm">
            ✅ ログ提出済みです。内容の確認・編集ができます。
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <LogField
            label="①リフレーム *"
            placeholder="セッションを通じて視点や認識がどう変わりましたか？"
            value={reframe}
            onChange={setReframe}
            disabled={isSubmitted}
          />
          <LogField
            label="②48h以内の次のアクション *"
            placeholder="この48時間で何をやってみますか？具体的に書いてください"
            value={nextStep}
            onChange={setNextStep}
            disabled={isSubmitted}
          />
          <LogField
            label="③つないでほしい人（任意）"
            placeholder="次に話したい専門家・分野があれば"
            value={referral}
            onChange={setReferral}
            disabled={isSubmitted}
          />

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="exec"
              checked={executed48h}
              onChange={e => setExecuted48h(e.target.checked)}
              disabled={isSubmitted}
              className="w-4 h-4"
            />
            <label htmlFor="exec" className="text-sm text-gray-700">
              ②のアクションを48時間以内に実行した
            </label>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          {!isSubmitted && (
            <button
              onClick={submit}
              disabled={saving}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <><Spinner size="sm" />提出中...</> : 'ログを提出する'}
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

function LogField({ label, placeholder, value, onChange, disabled }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; disabled: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50 disabled:text-gray-500"
      />
    </div>
  )
}
