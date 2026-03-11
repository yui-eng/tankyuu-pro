export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { ExpertList } from './ExpertList'

export default async function ExpertsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()

  const { data: experts } = await supabase
    .from('expert_profiles')
    .select('*, users(id, name)')
    .eq('profile_completed', true)
    .order('created_at', { ascending: false })

  const expertIds = (experts ?? []).map((e: any) => e.user_id)
  const { data: slots } = expertIds.length
    ? await supabase.from('availability_slots').select('expert_id').eq('status', 'free').in('expert_id', expertIds)
    : { data: [] }

  const slotCounts: Record<string, number> = {}
  for (const s of slots ?? []) {
    slotCounts[s.expert_id] = (slotCounts[s.expert_id] ?? 0) + 1
  }

  const expertData = (experts ?? []).map((e: any) => ({
    ...e,
    slotCount: slotCounts[e.user_id] ?? 0,
  }))

  return (
    <AppLayout user={userData}>
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">有識者を探す</h1>
        <p className="text-gray-500 text-sm mb-6">プロフィール完了済みの有識者一覧です</p>
        <ExpertList experts={expertData} />
      </div>
    </AppLayout>
  )
}
