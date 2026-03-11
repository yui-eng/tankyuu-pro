export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErrorState } from '@/components/ui/ErrorState'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function QuestionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()

  const { data: question, error } = await supabase
    .from('questions')
    .select('*, users(name)')
    .eq('id', id)
    .single()

  if (error || !question) {
    return (
      <AppLayout user={userData}>
        <ErrorState message="問いカードが見つかりません" />
      </AppLayout>
    )
  }

  const isOwner = question.student_id === authUser.id

  return (
    <AppLayout user={userData}>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/student/home" className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block">
          ← ホームに戻る
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex flex-wrap gap-1 mb-4">
            {(question.tags ?? []).map((t: string) => (
              <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{question.title}</h1>
          <p className="text-gray-400 text-xs mb-8">
            {question.users?.name} · {format(new Date(question.created_at), 'yyyy年M月d日', { locale: ja })}
          </p>

          <Section title="背景・動機" content={question.background} />
          <Section title="現在の仮説" content={question.hypothesis} />
          <Section title="行き詰まり・聞きたいこと" content={question.stuck_point} />
        </div>

        {isOwner && (
          <div className="mt-6 text-center">
            <Link
              href="/experts"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              この問いを持って有識者を探す →
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h2>
      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  )
}
