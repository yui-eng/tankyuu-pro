'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageSpinner, Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { Badge } from '@/components/ui/Badge'

export default function LogReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [log, setLog] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

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

      const { data: logData } = await supabase.from('three_line_logs').select('*').eq('session_id', sessionId).single()
      setLog(logData)
      if (logData?.expert_comment) setComment(logData.expert_comment)
      setLoading(false)
    }
    load()
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function approve() {
    if (!confirm('このログを承認しますか？')) return
    setSaving(true)
    const { error: e } = await supabase.from('three_line_logs').update({
      approved_by_expert_id: user.id,
      approved_at: new Date().toISOString(),
      expert_comment: comment || null,
    }).eq('session_id', sessionId)
    if (e) { setError('承認に失敗しました'); setSaving(false); return }
    await supabase.from('sessions').update({ status: 'done' }).eq('id', sessionId)
    setLog((prev: any) => ({ ...prev, approved_at: new Date().toISOString(), expert_comment: comment }))
    setSaving(false)
  }

  if (loading) return <AppLayout user={null}><PageSpinner /></AppLayout>
  if (error) return <AppLayout user={user}><ErrorState message={error} /></AppLayout>

  const q = session?.requests?.questions
  const isApproved = !!log?.approved_at

  return (
    <AppLayout user={user}>
      <div className="max-w-xl mx-auto px-4 py-10">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1">
          ← 戻る
        </button>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">3行ログ承認</h1>
          {isApproved && <Badge variant="green">承認済み</Badge>}
        </div>
        {q && <p className="text-gray-500 text-sm mb-8">問い：{q.title}</p>}

        {!log ? (
          <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-400">
            まだ生徒がログを提出していません
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <LogItem label="①リフレーム" value={log.reframe} />
            <LogItem label="②48h以内の次のアクション" value={log.next_step_48h} />
            {log.referral_wish && <LogItem label="③つないでほしい人" value={log.referral_wish} />}
            <div className="flex items-center gap-2 text-sm">
              <span className={`font-medium ${log.executed_48h ? 'text-green-600' : 'text-gray-400'}`}>
                {log.executed_48h ? '✅ 48hアクション実行済み' : '⬜ 48hアクション未確認'}
              </span>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">有識者コメント（任意）</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                disabled={isApproved}
                rows={3}
                placeholder="生徒へのフィードバックやコメント..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50"
              />
            </div>

            {!isApproved && (
              <button
                onClick={approve}
                disabled={saving}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <><Spinner size="sm" />承認中...</> : 'ログを承認する'}
              </button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function LogItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  )
}
