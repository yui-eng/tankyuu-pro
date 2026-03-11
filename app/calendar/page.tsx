export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { CalendarView } from './CalendarView'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  const role = userData?.role

  // Fetch all sessions with joined data, then filter by role in JS
  const { data: allSessions } = await supabase
    .from('sessions')
    .select(`
      id, scheduled_at, status,
      requests(
        id, student_id, expert_id,
        questions(title),
        student:users!requests_student_id_fkey(name),
        expert:users!requests_expert_id_fkey(name)
      )
    `)
    .order('scheduled_at', { ascending: true })

  let sessions = (allSessions ?? []) as any[]
  if (role === 'student') {
    sessions = sessions.filter((s: any) => s.requests?.student_id === authUser.id)
  } else if (role === 'expert') {
    sessions = sessions.filter((s: any) => s.requests?.expert_id === authUser.id)
  }

  // Fetch free slots
  let slots: any[] = []
  if (role === 'expert') {
    const { data } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('expert_id', authUser.id)
      .eq('status', 'free')
      .order('start_datetime', { ascending: true })
    slots = data ?? []
  } else if (role === 'admin') {
    const { data } = await supabase
      .from('availability_slots')
      .select('*, users(name)')
      .eq('status', 'free')
      .order('start_datetime', { ascending: true })
    slots = data ?? []
  }

  return (
    <AppLayout user={userData}>
      <CalendarView sessions={sessions} slots={slots} role={role} />
    </AppLayout>
  )
}
