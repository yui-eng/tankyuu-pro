'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createChatThread(expertId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 既存スレッドを確認
  const { data: existing } = await supabase
    .from('chat_threads')
    .select('id')
    .eq('student_id', user.id)
    .eq('expert_id', expertId)
    .limit(1)
    .maybeSingle()

  if (existing) redirect(`/chat/${existing.id}`)

  const { data, error } = await supabase
    .from('chat_threads')
    .insert({ student_id: user.id, expert_id: expertId })
    .select('id')
    .single()

  if (error || !data) redirect(`/experts/${expertId}?error=chat`)

  redirect(`/chat/${data.id}`)
}
