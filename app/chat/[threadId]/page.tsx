'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { PageSpinner, Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { StatusBadge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function ChatPage() {
  const { threadId } = useParams<{ threadId: string }>()
  const router = useRouter()
  const supabase = createClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<any>(null)
  const [thread, setThread] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [request, setRequest] = useState<any>(null)

  const load = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }

    const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    setUser(userData)

    const { data: threadData, error: te } = await supabase
      .from('chat_threads')
      .select('*, requests(*, expert_profiles(real_name, affiliation), availability_slots(start_datetime))')
      .eq('id', threadId)
      .single()

    if (te || !threadData) { setError('チャットが見つかりません'); setLoading(false); return }

    // Permission check: only participant or admin
    const isParticipant = threadData.student_id === authUser.id || threadData.expert_id === authUser.id
    if (!isParticipant && userData?.role !== 'admin') { setError('このチャットを閲覧する権限がありません'); setLoading(false); return }

    setThread(threadData)
    setRequest(threadData.requests)

    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('*, users(name, role)')
      .eq('thread_id', threadId)
      .order('created_at')

    setMessages(msgs ?? [])
    setLoading(false)
  }, [threadId, router, supabase])

  useEffect(() => { load() }, [load])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${threadId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
        // Fetch sender info
        supabase.from('users').select('name, role').eq('id', (payload.new as any).sender_id).single()
          .then(({ data }) => {
            setMessages(prev => prev.map(m => m.id === (payload.new as any).id ? { ...m, users: data } : m))
          })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [threadId, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!text.trim() || !user) return
    if (user.role === 'admin') return // Admin cannot send
    setSending(true)
    const { error: e } = await supabase.from('chat_messages').insert({
      thread_id: threadId,
      sender_id: user.id,
      message: text.trim(),
    })
    if (!e) setText('')
    setSending(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  if (loading) return <><Header user={null} /><PageSpinner /></>
  if (error) return <><Header user={user} /><ErrorState message={error} onRetry={load} /></>

  const isAdmin = user?.role === 'admin'
  const slot = request?.availability_slots

  return (
    <>
      <Header user={user} />
      <div className="flex flex-col h-[calc(100vh-56px)]">
        {/* Chat header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {request?.expert_profiles?.real_name ?? '有識者'} × {thread?.student_id === user?.id ? 'あなた' : '生徒'}
                </span>
                {request && <StatusBadge status={request.status} />}
              </div>
              {slot?.start_datetime && (
                <p className="text-gray-400 text-xs mt-0.5">
                  {format(new Date(slot.start_datetime), 'M月d日(E) HH:mm', { locale: ja })} · 20分
                </p>
              )}
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
            {messages.map(msg => {
              const isMe = msg.sender_id === user?.id
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
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
                onClick={send}
                disabled={!text.trim() || sending}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                {sending ? <Spinner size="sm" /> : '送信'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 text-center text-gray-400 text-sm">
            管理者は閲覧専用です
          </div>
        )}
      </div>
    </>
  )
}
