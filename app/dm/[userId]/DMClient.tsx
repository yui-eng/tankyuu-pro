'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ref, onValue, push, type DataSnapshot } from 'firebase/database'
import { db } from '@/lib/firebase'
import { format } from 'date-fns'

type Message = {
  id: string
  senderId: string
  content: string
  createdAt: number
}

type Props = {
  currentUserId: string
  otherUserId: string
  otherUserName: string
}

export function DMClient({ currentUserId, otherUserId, otherUserName }: Props) {
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const channelKey = [currentUserId, otherUserId].sort().join('_')

  useEffect(() => {
    const messagesRef = ref(db, `dm/${channelKey}`)
    const unsubscribe = onValue(messagesRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val()
      if (data) {
        const msgs = Object.entries(data)
          .map(([id, val]: any) => ({ id, ...val }))
          .sort((a, b) => a.createdAt - b.createdAt)
        setMessages(msgs)
      } else {
        setMessages([])
      }
    })
    return () => unsubscribe()
  }, [channelKey])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!text.trim() || sending) return
    const content = text.trim()
    setText('')
    setSending(true)
    try {
      await push(ref(db, `dm/${channelKey}`), {
        senderId: currentUserId,
        content,
        createdAt: Date.now(),
      })
    } finally {
      setSending(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="font-semibold text-gray-900">{otherUserName} へのメッセージ</span>
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← 戻る</button>
        </div>
      </div>

      <div className="bg-amber-50 border-b border-amber-100 py-1.5 text-center">
        <p className="text-amber-700 text-xs">安全のため、運営が内容を閲覧する場合があります</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">まだメッセージがありません。最初のメッセージを送りましょう！</p>
          )}
          {messages.map(msg => {
            const isMe = msg.senderId === currentUserId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-xs text-gray-300 px-1">
                    {format(new Date(msg.createdAt), 'HH:mm')}
                  </span>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>

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
            disabled={!text.trim() || sending}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {sending ? '送信中...' : '送信'}
          </button>
        </div>
      </div>
    </div>
  )
}
