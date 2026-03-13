export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { MembersContent } from './MembersContent'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()

  const [{ data: experts }, { data: students }] = await Promise.all([
    supabase
      .from('expert_profiles')
      .select('*, users(id, name, avatar_url, created_at)')
      .eq('profile_completed', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('*, student_profiles(school, grade)')
      .eq('role', 'student')
      .order('created_at', { ascending: false }),
  ])

  return (
    <AppLayout user={userData}>
      <MembersContent experts={experts ?? []} students={students ?? []} />
    </AppLayout>
  )
}
