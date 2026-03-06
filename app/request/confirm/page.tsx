'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { PageSpinner, Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

function ConfirmContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const slotId = searchParams.get('slotId')
  const expertId = searchParams.get('expertId')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [slot, setSlot] = useState<any>(null)
  const [expert, setExpert] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [selectedQuestion, setSelectedQuestion] = useState('')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function load() {
      if (!slotId || !expertId) { setError('パラメータが不正です'); setLoading(false); return }
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }

      const [{ data: userData }, { data: slotData }, { data: expertData }, { data: qs }] = await Promise.all([
        supabase.from('users').select('*').eq('id', authUser.id).single(),
        supabase.from('availability_slots').select('*').eq('id', slotId).single(),
        supabase.from('expert_profiles').select('*, users(name)').eq('user_id', expertId).single(),
        supabase.from('questions').select('*').eq('student_id', authUser.id).order('created_at', { ascending: false }),
      ])

      if (!slotData || !expertData) { setError('データを取得できませんでした'); setLoading(false); return }
      setUser(userData); setSlot(slotData); setExpert(expertData)
      setQuestions(qs ?? [])
      if (qs?.length) setSelectedQuestion(qs[0].id)
      setLoading(false)
    }
    load()
  }, [slotId, expertId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (!selectedQuestion) { setError('問いカードを選択してください'); return }
    setSubmitting(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { setError('未ログインです'); setSubmitting(false); return }

    // Create request
    const { data: request, error: reqErr } = await supabase.from('requests').insert({
      question_id: selectedQuestion,
      student_id: authUser.id,
      expert_id: expertId,
      slot_id: slotId,
      status: 'pending',
    }).select().single()

    if (reqErr || !request) { setError('依頼の作成に失敗しました: ' + reqErr?.message); setSubmitting(false); return }

    // Mark slot as booked
    await supabase.from('availability_slots').update({ status: 'booked' }).eq('id', slotId)

    router.push('/student/home')
  }

  if (loading) return <PageSpinner />
  if (error && !slot) return <ErrorState message={error} />

  return (
    <>
      <Header user={user} />
      <div className="max-w-xl mx-auto px-4 py-10">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1">
          ← 戻る
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">依頼を確認する</h1>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">依頼内容</h2>
          <div className="space-y-3 text-sm">
            <Row label="有識者" value={expert?.real_name} />
            <Row label="所属" value={expert?.affiliation} />
            <Row label="日時" value={slot ? format(new Date(slot.start_datetime), 'M月d日(E) HH:mm〜', { locale: ja }) : '-'} />
            <Row label="時間" value="20分" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">持ち込む問いカード *</h2>
          {!questions.length ? (
            <p className="text-gray-400 text-sm">問いカードがありません。先に作成してください。</p>
          ) : (
            <div className="space-y-2">
              {questions.map(q => (
                <label key={q.id} className={`flex gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${selectedQuestion === q.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  <input type="radio" name="question" value={q.id} checked={selectedQuestion === q.id} onChange={() => setSelectedQuestion(q.id)} className="mt-0.5" />
                  <span className="text-sm text-gray-900">{q.title}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          <strong>注意：</strong>依頼送信後、有識者の承諾をお待ちください。
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button
          onClick={submit}
          disabled={submitting || !selectedQuestion}
          className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <><Spinner size="sm" />送信中...</> : '依頼を送信する'}
        </button>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-24 shrink-0">{label}</span>
      <span className="text-gray-900 font-medium">{value ?? '-'}</span>
    </div>
  )
}

export default function RequestConfirmPage() {
  return <Suspense fallback={<PageSpinner />}><ConfirmContent /></Suspense>
}
