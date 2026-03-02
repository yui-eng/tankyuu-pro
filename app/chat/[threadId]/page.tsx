export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ErrorState } from '@/components/ui/ErrorState'
import { ChatClient } from './ChatClient'

export default async function ChatPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()

  // スレッド取得（シンプルなクエリ）
  const { data: thread } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('id', threadId)
    .single()

  if (!thread) {
    return <><Header user={userData} /><ErrorState message="チャットが見つかりません" /></>
  }

  const isParticipant = thread.student_id === authUser.id || thread.expert_id === authUser.id
  if (!isParticipant && userData?.role !== 'admin') {
    return <><Header user={userData} /><ErrorState message="このチャットを閲覧する権限がありません" /></>
  }

  // 有識者プロフィール取得
  const { data: expertProfile } = await supabase
    .from('expert_profiles')
    .select('real_name, affiliation')
    .eq('user_id', thread.expert_id)
    .single()

  // メッセージ取得
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*, users(name, role)')
    .eq('thread_id', threadId)
    .order('created_at')

  return (
    <>
      <Header user={userData} />
      <ChatClient
        thread={thread}
        expertProfile={expertProfile}
        initialMessages={messages ?? []}
        user={userData}
      />
    </>
  )
}
