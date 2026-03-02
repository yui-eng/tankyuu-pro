'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { PageSpinner, Spinner } from '@/components/ui/Spinner'
import { ErrorState, EmptyState } from '@/components/ui/ErrorState'
import { StatusBadge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function AvailabilityPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [expert, setExpert] = useState<any>(null)
  const [slots, setSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('10:00')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const load = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }
    const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    if (userData?.role !== 'expert') { router.push('/login'); return }
    setUser(userData)

    const { data: ep } = await supabase.from('expert_profiles').select('*').eq('user_id', authUser.id).single()
    setExpert(ep)

    if (!ep?.profile_completed) { setLoading(false); return }

    const { data: slotsData, error: se } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('expert_id', authUser.id)
      .order('start_datetime')
    if (se) { setError('取得に失敗しました'); setLoading(false); return }
    setSlots(slotsData ?? [])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load() }, [load])

  async function addSlot() {
    if (!newDate || !newTime) { setAddError('日付と時刻を選択してください'); return }
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    setAdding(true); setAddError('')
    const dt = new Date(`${newDate}T${newTime}:00`)
    if (isNaN(dt.getTime())) { setAddError('日時が不正です'); setAdding(false); return }
    const { error: e } = await supabase.from('availability_slots').insert({
      expert_id: authUser.id,
      start_datetime: dt.toISOString(),
      duration_minutes: 20,
      status: 'free',
    })
    if (e) { setAddError('追加に失敗しました: ' + e.message); setAdding(false); return }
    setNewDate(''); setNewTime('10:00')
    await load()
    setAdding(false)
  }

  async function deleteSlot(id: string) {
    if (!confirm('この空き枠を削除しますか？')) return
    await supabase.from('availability_slots').delete().eq('id', id).eq('status', 'free')
    setSlots(prev => prev.filter(s => s.id !== id))
  }

  if (loading) return <><Header user={null} /><PageSpinner /></>
  if (error) return <><Header user={user} /><ErrorState message={error} onRetry={load} /></>

  if (!expert?.profile_completed) {
    return (
      <>
        <Header user={user} />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-600 mb-4">空き枠を登録するには、まずプロフィールを完成させてください。</p>
          <button onClick={() => router.push('/profile')} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            プロフィールを編集する
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <Header user={user} />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">空き枠を管理する</h1>

        {/* Add slot */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">空き枠を追加（20分固定）</h2>
          <div className="flex gap-3 flex-wrap">
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addSlot}
              disabled={adding}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {adding ? <><Spinner size="sm" />追加中</> : '＋ 追加'}
            </button>
          </div>
          {addError && <p className="text-red-600 text-sm mt-2">{addError}</p>}
        </div>

        {/* Slots list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-4">登録済みの枠</h2>
          {!slots.length ? (
            <EmptyState message="枠がありません。上から追加してください。" />
          ) : (
            <div className="space-y-2">
              {slots.map(slot => (
                <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(slot.start_datetime), 'M月d日(E) HH:mm', { locale: ja })}
                    </p>
                    <p className="text-gray-400 text-xs">20分</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={slot.status} />
                    {slot.status === 'free' && (
                      <button
                        onClick={() => deleteSlot(slot.id)}
                        className="text-red-400 hover:text-red-600 text-sm transition-colors"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
