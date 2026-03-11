export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { EmptyState } from '@/components/ui/ErrorState'

export default async function StudentHomePage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  if (!userData || userData.role !== 'student') redirect('/login')

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('student_id', authUser.id)
    .order('created_at', { ascending: false })

  return (
    <AppLayout user={userData}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">こんにちは、{userData.name}さん</h1>
            <p className="text-gray-500 text-sm mt-1">あなたの探求活動を応援しています</p>
          </div>
          <Link
            href="/question/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            ＋ 問いを作る
          </Link>
        </div>

        {/* My Questions */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">自分の問いカード</h2>
          {!questions?.length ? (
            <EmptyState message="まだ問いカードがありません。最初の問いを作ってみましょう！" />
          ) : (
            <div className="space-y-3">
              {questions.map(q => (
                <Link key={q.id} href={`/question/${q.id}`}>
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow">
                    <h3 className="font-medium text-gray-900 mb-1">{q.title}</h3>
                    <p className="text-gray-500 text-sm line-clamp-2">{q.background}</p>
                    <div className="flex gap-1 mt-3 flex-wrap">
                      {(q.tags ?? []).map((t: string) => (
                        <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick links */}
        <div className="bg-blue-50 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-900 mb-3">次のアクション</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/experts" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              有識者を探す
            </Link>
            <Link href="/question/new" className="px-4 py-2 bg-white text-blue-700 text-sm rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
              問いカードを作る
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
