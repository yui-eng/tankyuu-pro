export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { StatusBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/ErrorState'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

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

  const { data: chatThreads } = await supabase
    .from('chat_threads')
    .select('id, expert_id, created_at')
    .eq('student_id', authUser.id)
    .order('created_at', { ascending: false })

  const expertIds = [...new Set((chatThreads ?? []).map((t: any) => t.expert_id))]
  const { data: epList } = expertIds.length
    ? await supabase.from('expert_profiles').select('user_id, real_name').in('user_id', expertIds)
    : { data: [] }
  const epNameMap: Record<string, string> = {}
  for (const ep of epList ?? []) { epNameMap[ep.user_id] = ep.real_name }

  return (
    <>
      <Header user={userData} />
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

        {/* メッセージ */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">メッセージ</h2>
            <Link href="/experts" className="text-sm text-blue-600 hover:underline">
              有識者を探す →
            </Link>
          </div>
          {!chatThreads?.length ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
              <p className="text-gray-400 text-sm mb-3">まだメッセージはありません</p>
              <Link
                href="/experts"
                className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                有識者を探してメッセージを送る
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {chatThreads.map((t: any) => (
                <Link key={t.id} href={`/chat/${t.id}`}>
                  <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 hover:shadow-md transition-shadow flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{epNameMap[t.expert_id] ?? '有識者'}</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {format(new Date(t.created_at), 'M月d日(E)', { locale: ja })}
                      </p>
                    </div>
                    <span className="text-blue-600 text-sm">開く →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

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
    </>
  )
}
