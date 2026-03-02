'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createChatThread } from './actions'
import { Spinner } from '@/components/ui/Spinner'

export function StartChatButton({ expertId, existingThreadId }: {
  expertId: string
  existingThreadId?: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (existingThreadId) {
      router.push(`/chat/${existingThreadId}`)
      return
    }
    startTransition(async () => {
      await createChatThread(expertId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
    >
      {pending && <Spinner size="sm" />}
      {existingThreadId ? 'チャットを開く' : 'メッセージを送る'}
    </button>
  )
}
