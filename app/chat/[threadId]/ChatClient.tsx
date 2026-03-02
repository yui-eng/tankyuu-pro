'use client'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from './actions'
import { Spinner } from '@/components/ui/Spinner'
import { format } from 'date-fns'

type Props = {
  thread: any
  expertProfile: any
  initialMessages: any[]
  user: any
}

export function ChatClient({ thread, expertProfile, initialMessages, user }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<any[]>(initialMessages)
  const [text, setText] = useState('')
  const [pending, startTransition] = useTransition()

  // Realtimeで新メッセージを受信
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${thread.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${thread.id}`,
      }, () => {
        router.refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [thread.id, supabase, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // initialMessagesが更新されたら同期
  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  function handleSend() {
    if (!text.trim() || user?.role === 'admin') return
    const msg = text
    setText('')
    startTransition(async () => {
      await sendMessage(thread.id, msg)
      router.refresh()
    })
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const isAdmin = user?.role === 'admin'

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Chat header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                {expertProfile?.real_name ?? '有識者'} × {thread.student_id === user?.id ? 'あなた' : '生徒'}
              </span>
            </div>
          </div>
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← 戻る</button>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="bg-amber-50 border-b border-amber-100 py-1.5 text-center">
        <p className="text-amber-700 text-xs">安全のため、運営が内容を閲覧する場合があります</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">まだメッセージがありません。最初のメッセージを送ってみましょう！</p>
          )}
          {messages.map(msg => {
            const isMe = msg.sender_id === user?.id
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <span className="text-xs text-gray-400 px-1">{msg.users?.name ?? '相手'}</span>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
                  }`}>
                    {msg.message}
                  </div>
                  <span className="text-xs text-gray-300 px-1">
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </span>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      {!isAdmin ? (
        <div className="bg-white border-t border-gray-100 px-4 py-3">
          <div className="max-w-2xl mx-auto flex gap-3">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="メッセージを入力（Enterで送信）"
              rows={1}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || pending}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              {pending ? <Spinner size="sm" /> : '送信'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 text-center text-gray-400 text-sm">
          管理者は閲覧専用です
        </div>
      )}
    </div>
  )
}
