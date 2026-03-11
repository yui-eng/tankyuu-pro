export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { StatusBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/ErrorState'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function ExpertInboxPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  if (!userData || userData.role !== 'expert') redirect('/login')

  const { data: expertProfile } = await supabase
    .from('expert_profiles').select('profile_completed').eq('user_id', authUser.id).single()

  if (!expertProfile?.profile_completed) {
    redirect('/profile')
  }

  const { data: requests } = await supabase
    .from('requests')
    .select(`
      *,
      questions(id, title, tags, background),
      users!requests_student_id_fkey(name),
      availability_slots(start_datetime)
    `)
    .eq('expert_id', authUser.id)
    .order('created_at', { ascending: false })

  const pending = requests?.filter(r => r.status === 'pending') ?? []
  const others = requests?.filter(r => r.status !== 'pending') ?? []

  return (
    <AppLayout user={userData}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">依頼受信箱</h1>

        {pending.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              承認待ち
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{pending.length}</span>
            </h2>
            <div className="space-y-3">
              {pending.map((r: any) => <RequestCard key={r.id} r={r} />)}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">過去の依頼</h2>
          {!others.length ? (
            <EmptyState message="まだ依頼はありません" />
          ) : (
            <div className="space-y-3">
              {others.map((r: any) => <RequestCard key={r.id} r={r} />)}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  )
}

function RequestCard({ r }: { r: any }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-medium text-gray-900">{r.questions?.title}</p>
          <p className="text-gray-500 text-sm">生徒：{r.users?.name}</p>
        </div>
        <StatusBadge status={r.status} />
      </div>
      {r.availability_slots?.start_datetime && (
        <p className="text-gray-400 text-xs mb-2">
          {format(new Date(r.availability_slots.start_datetime), 'M月d日(E) HH:mm', { locale: ja })}
        </p>
      )}
      <div className="flex flex-wrap gap-1 mb-3">
        {(r.questions?.tags ?? []).map((t: string) => (
          <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{t}</span>
        ))}
      </div>
      <div className="flex gap-3">
        <Link href={`/request/${r.id}`} className="text-sm text-blue-600 hover:underline">詳細・承諾/辞退</Link>
      </div>
    </div>
  )
}
