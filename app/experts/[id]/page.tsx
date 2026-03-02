export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { ErrorState } from '@/components/ui/ErrorState'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function ExpertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()

  const { data: expert, error } = await supabase
    .from('expert_profiles')
    .select('*, users(id, name, email)')
    .eq('user_id', id)
    .eq('profile_completed', true)
    .single()

  if (error || !expert) {
    return <><Header user={userData} /><ErrorState message="有識者が見つかりません" /></>
  }

  const { data: slots } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('expert_id', id)
    .eq('status', 'free')
    .gte('start_datetime', new Date().toISOString())
    .order('start_datetime')

  const { data: questions } = await supabase
    .from('questions')
    .select('id, title, tags')
    .eq('student_id', authUser.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <Header user={userData} />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/experts" className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
          ← 有識者一覧に戻る
        </Link>

        {/* Expert profile */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{expert.real_name}</h1>
          <p className="text-gray-500 mb-4">{expert.affiliation}</p>
          <div className="flex flex-wrap gap-1 mb-4">
            {(expert.tags ?? []).map((t: string) => (
              <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
          {expert.bio && <p className="text-gray-700 leading-relaxed">{expert.bio}</p>}
          {expert.facebook_url && (
            <a href={expert.facebook_url} target="_blank" rel="noopener noreferrer"
              className="mt-4 inline-block text-sm text-blue-600 hover:underline">
              Facebook プロフィールを見る →
            </a>
          )}
        </div>

        {/* Availability slots */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4">空き枠（20分）</h2>
          {!slots?.length ? (
            <p className="text-gray-400 text-sm py-4 text-center">現在空き枠はありません</p>
          ) : (
            <div className="space-y-3">
              {slots.map(slot => (
                <div key={slot.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">
                      {format(new Date(slot.start_datetime), 'M月d日(E) HH:mm', { locale: ja })}
                    </p>
                    <p className="text-gray-400 text-sm">20分</p>
                  </div>
                  <RequestButton
                    slotId={slot.id}
                    expertId={id}
                    questions={questions ?? []}
                    studentRole={userData?.role}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function RequestButton({ slotId, expertId, questions, studentRole }: {
  slotId: string; expertId: string; questions: any[]; studentRole?: string
}) {
  if (studentRole !== 'student') return null
  if (!questions.length) {
    return (
      <Link href="/question/new" className="text-sm text-blue-600 hover:underline">
        まず問いを作る →
      </Link>
    )
  }
  return (
    <Link
      href={`/request/confirm?slotId=${slotId}&expertId=${expertId}`}
      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
    >
      この枠で依頼する
    </Link>
  )
}
