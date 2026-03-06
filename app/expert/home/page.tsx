export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/ErrorState'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function ExpertHomePage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  if (!userData || userData.role !== 'expert') redirect('/login')

  const { data: expertProfile } = await supabase
    .from('expert_profiles')
    .select('*')
    .eq('user_id', authUser.id)
    .single()

  const { data: requests } = await supabase
    .from('requests')
    .select('*, questions(title, tags), users!requests_student_id_fkey(name), availability_slots(start_datetime)')
    .eq('expert_id', authUser.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: slots } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('expert_id', authUser.id)
    .eq('status', 'free')
    .gte('start_datetime', new Date().toISOString())
    .order('start_datetime')
    .limit(3)

  const isProfileComplete = expertProfile?.profile_completed

  return (
    <>
      <Header user={userData} />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              こんにちは、{expertProfile?.real_name ?? userData.name}さん
            </h1>
            <p className="text-gray-500 text-sm mt-1">{expertProfile?.affiliation}</p>
          </div>
          {isProfileComplete
            ? <Badge variant="green">プロフィール完了</Badge>
            : <Badge variant="yellow">プロフィール未完了</Badge>}
        </div>

        {!isProfileComplete && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-amber-900 mb-2">プロフィールを完成させてください</h2>
            <p className="text-amber-700 text-sm mb-4">実名・所属・Facebook URL・タグが揃うと、依頼の受信が可能になります。</p>
            <Link href="/profile" className="inline-block px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors">
              プロフィールを編集する
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link href="/expert/inbox" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {requests?.filter(r => r.status === 'pending').length ?? 0}
            </div>
            <div className="text-gray-500 text-sm">新着依頼</div>
          </Link>
          <Link href="/expert/availability" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">{slots?.length ?? 0}</div>
            <div className="text-gray-500 text-sm">空き枠</div>
          </Link>
        </div>

        {/* Recent requests */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">最近の依頼</h2>
            <Link href="/expert/inbox" className="text-sm text-blue-600 hover:underline">すべて見る</Link>
          </div>
          {!requests?.length ? (
            <EmptyState message="まだ依頼はありません" />
          ) : (
            <div className="space-y-3">
              {requests.map((r: any) => (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{r.questions?.title}</p>
                      <p className="text-gray-500 text-sm">{r.users?.name}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.availability_slots?.start_datetime && (
                    <p className="text-gray-400 text-xs mb-3">
                      {format(new Date(r.availability_slots.start_datetime), 'M月d日(E) HH:mm', { locale: ja })}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <Link href={`/request/${r.id}`} className="text-sm text-blue-600 hover:underline">詳細を見る</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex gap-3">
          <Link href="/expert/availability" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            空き枠を管理する
          </Link>
          <Link href="/profile" className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
            プロフィール編集
          </Link>
        </div>
      </div>
    </>
  )
}
