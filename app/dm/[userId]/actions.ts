'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendDM(receiverId: string, content: string) {
  if (!content.trim()) return { error: 'メッセージを入力してください' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { error } = await supabase.from('messages').insert({
    sender_id: user.id,
    receiver_id: receiverId,
    content: content.trim(),
  })

  if (error) return { error: '送信に失敗しました' }

  revalidatePath(`/dm/${receiverId}`)
  return { error: null }
}
