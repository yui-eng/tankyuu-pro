'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { PageSpinner, Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { StatusBadge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'

export default function RequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }
      const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
      setUser(userData)

      const { data: req, error: re } = await supabase
        .from('requests')
        .select(`
          *,
          questions(*),
          users!requests_student_id_fkey(name, email),
          availability_slots(*),
          chat_threads(id),
          sessions(id, status, three_line_logs(*))
        `)
        .eq('id', requestId)
        .single()

      if (re || !req) { setError('依頼が見つかりません'); setLoading(false); return }
      if (req.expert_id !== authUser.id && userData?.role !== 'admin') {
        setError('この依頼を閲覧する権限がありません'); setLoading(false); return
      }
      setRequest(req); setLoading(false)
    }
    load()
  }, [requestId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function accept() {
    if (!confirm('依頼を承諾しますか？')) return
    setActing(true)
    const { error: e } = await supabase.from('requests').update({ status: 'accepted' }).eq('id', requestId)
    if (e) { setError('操作に失敗しました'); setActing(false); return }
    // Create session
    await supabase.from('sessions').insert({
      request_id: requestId,
      scheduled_at: request.availability_slots?.start_datetime,
      status: 'scheduled',
    })
    // Create chat thread
    await supabase.from('chat_threads').insert({
      request_id: requestId,
      student_id: request.student_id,
      expert_id: request.expert_id,
    })
    setRequest((prev: any) => ({ ...prev, status: 'accepted' }))
    setActing(false)
  }

  async function decline() {
    if (!confirm('依頼を辞退しますか？')) return
    setActing(true)
    await supabase.from('requests').update({ status: 'declined' }).eq('id', requestId)
    await supabase.from('availability_slots').update({ status: 'free' }).eq('id', request.slot_id)
    setRequest((prev: any) => ({ ...prev, status: 'declined' }))
    setActing(false)
  }

  if (loading) return <><Header user={null} /><PageSpinner /></>
  if (error) return <><Header user={user} /><ErrorState message={error} /></>

  const q = request.questions
  const slot = request.availability_slots
  const thread = request.chat_threads?.[0]
  const session = request.sessions?.[0]
  const log = session?.three_line_logs?.[0]

  return (
    <>
      <Header user={user} />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1">
          ← 戻る
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">依頼詳細</h1>
          <StatusBadge status={request.status} />
        </div>

        {/* Question info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <h2 className="font-semibold text-gray-700 mb-3">問いカード</h2>
          <p className="font-medium text-gray-900 mb-2">{q?.title}</p>
          <p className="text-gray-600 text-sm mb-2 leading-relaxed">{q?.background}</p>
          <p className="text-gray-500 text-sm"><strong>仮説：</strong>{q?.hypothesis}</p>
          <p className="text-gray-500 text-sm mt-1"><strong>行き詰まり：</strong>{q?.stuck_point}</p>
          <div className="flex flex-wrap gap-1 mt-3">
            {(q?.tags ?? []).map((t: string) => (
              <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        </div>

        {/* Session info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
          <h2 className="font-semibold text-gray-700 mb-3">セッション情報</h2>
          <div className="space-y-2 text-sm">
            <Row label="生徒" value={request.users?.name} />
            <Row label="日時" value={slot ? format(new Date(slot.start_datetime), 'M月d日(E) HH:mm', { locale: ja }) : '-'} />
            <Row label="時間" value="20分" />
          </div>
        </div>

        {/* Actions */}
        {request.status === 'pending' && user?.role === 'expert' && (
          <div className="flex gap-3 mb-4">
            <button
              onClick={accept}
              disabled={acting}
              className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {acting ? <Spinner size="sm" /> : '✓ 承諾する'}
            </button>
            <button
              onClick={decline}
              disabled={acting}
              className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50"
            >
              辞退する
            </button>
          </div>
        )}

        {/* Chat & Log */}
        <div className="flex gap-3 flex-wrap">
          {thread?.id && (
            <Link href={`/chat/${thread.id}`} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              チャットを開く
            </Link>
          )}
          {session?.id && user?.role === 'expert' && (
            <Link href={`/log/review/${session.id}`} className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
              ログを確認・承認
            </Link>
          )}
          {session?.id && user?.role === 'student' && !log?.submitted_at && (
            <Link href={`/log/submit/${session.id}`} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
              3行ログを提出する
            </Link>
          )}
        </div>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-16 shrink-0">{label}</span>
      <span className="text-gray-900">{value ?? '-'}</span>
    </div>
  )
}
