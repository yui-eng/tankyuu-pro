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

  // 有識者プロフィールから名前を取得（usersテーブルはRLSで読めないため）
  const { data: expertProfile } = await supabase
    .from('expert_profiles').select('real_name').eq('user_id', userId).eq('profile_completed', true).maybeSingle()

  if (!expertProfile) {
    return <><Header user={userData} /><ErrorState message="有識者が見つかりません" /></>
  }

  const displayName = expertProfile.real_name ?? '有識者'

  return (
    <>
      <Header user={userData} />
      <DMClient
        currentUserId={authUser.id}
        otherUserId={userId}
        otherUserName={displayName}
      />
    </>
  )
}
