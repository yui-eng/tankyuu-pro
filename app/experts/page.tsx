export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/ui/ErrorState'

export default async function ExpertsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()

  const { data: experts } = await supabase
    .from('expert_profiles')
    .select('*, users(id, name, email)')
    .eq('profile_completed', true)
    .order('created_at', { ascending: false })

  // Get free slot counts
  const expertIds = (experts ?? []).map((e: any) => e.user_id)
  const { data: slots } = expertIds.length
    ? await supabase.from('availability_slots').select('expert_id').eq('status', 'free').in('expert_id', expertIds)
    : { data: [] }

  const slotCounts: Record<string, number> = {}
  for (const s of slots ?? []) {
    slotCounts[s.expert_id] = (slotCounts[s.expert_id] ?? 0) + 1
  }

  return (
    <>
      <Header user={userData} />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">有識者を探す</h1>
        <p className="text-gray-500 text-sm mb-8">プロフィール完了済みの有識者一覧です</p>

        {!experts?.length ? (
          <EmptyState message="現在登録中の有識者はいません。しばらくお待ちください。" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {experts.map((e: any) => (
              <Link key={e.user_id} href={`/experts/${e.user_id}`}>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow h-full">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h2 className="font-semibold text-gray-900">{e.real_name}</h2>
                      <p className="text-gray-500 text-sm">{e.affiliation}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-blue-600 font-bold text-lg">{slotCounts[e.user_id] ?? 0}</div>
                      <div className="text-gray-400 text-xs">空き枠</div>
                    </div>
                  </div>
                  {e.bio && <p className="text-gray-600 text-sm line-clamp-2 mb-3">{e.bio}</p>}
                  <div className="flex flex-wrap gap-1">
                    {(e.tags ?? []).slice(0, 4).map((t: string) => (
                      <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
