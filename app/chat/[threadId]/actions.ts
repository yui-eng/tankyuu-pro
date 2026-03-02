'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendMessage(threadId: string, message: string) {
  if (!message.trim()) return { error: 'メッセージを入力してください' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証エラー' }

  const { error } = await supabase.from('chat_messages').insert({
    thread_id: threadId,
    sender_id: user.id,
    message: message.trim(),
  })

  if (error) return { error: '送信に失敗しました' }

  revalidatePath(`/chat/${threadId}`)
  return { error: null }
}
