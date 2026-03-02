export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ErrorState } from '@/components/ui/ErrorState'
import { DMClient } from './DMClient'

export default async function DMPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()

  // 相手のユーザー情報
  const { data: otherUser } = await supabase
    .from('users').select('id, name, role').eq('id', userId).single()

  if (!otherUser) {
    return <><Header user={userData} /><ErrorState message="ユーザーが見つかりません" /></>
  }

  // 有識者なら本名を使う
  const { data: expertProfile } = await supabase
    .from('expert_profiles').select('real_name').eq('user_id', userId).maybeSingle()

  const displayName = expertProfile?.real_name ?? otherUser.name ?? '相手'

  // メッセージ取得
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${authUser.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${authUser.id})`)
    .order('created_at')

  return (
    <>
      <Header user={userData} />
      <DMClient
        currentUserId={authUser.id}
        otherUserId={userId}
        otherUserName={displayName}
        initialMessages={messages ?? []}
      />
    </>
  )
}
