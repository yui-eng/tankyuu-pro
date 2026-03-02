'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui/Spinner'

export function StartChatButton({ expertId, studentId, existingThreadId }: {
  expertId: string
  studentId: string
  existingThreadId?: string | null
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (existingThreadId) {
      router.push(`/chat/${existingThreadId}`)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('chat_threads')
      .insert({ student_id: studentId, expert_id: expertId })
      .select('id')
      .single()
    if (error || !data) {
      alert('チャットの開始に失敗しました')
      setLoading(false)
      return
    }
    router.push(`/chat/${data.id}`)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
    >
      {loading && <Spinner size="sm" />}
      {existingThreadId ? 'チャットを開く' : 'メッセージを送る'}
    </button>
  )
}
