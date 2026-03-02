'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Spinner } from '@/components/ui/Spinner'

const TAGS = ['地方創生', '教育', 'AI・テクノロジー', '環境', '医療・福祉', '社会起業', 'キャリア', 'その他']

export default function QuestionNewPage() {
  const router = useRouter()
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [background, setBackground] = useState('')
  const [hypothesis, setHypothesis] = useState('')
  const [stuckPoint, setStuckPoint] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  async function submit() {
    if (!title || !background || !hypothesis || !stuckPoint || selectedTags.length === 0) {
      setError('すべての必須項目を入力してください')
      return
    }
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('未ログインです'); setLoading(false); return }

    const { data, error: e } = await supabase.from('questions').insert({
      student_id: user.id,
      title,
      background,
      hypothesis,
      stuck_point: stuckPoint,
      tags: selectedTags,
    }).select().single()

    if (e || !data) { setError('作成に失敗しました: ' + e?.message); setLoading(false); return }
    router.push(`/question/${data.id}`)
  }

  return (
    <>
      <Header user={null} />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1">
          ← 戻る
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">問いカードを作る</h1>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <Textarea label="探求テーマ・問い *" value={title} onChange={setTitle} placeholder="例：なぜ地方の若者は都市に出てしまうのか？" rows={2} />
          <Textarea label="背景・動機 *" value={background} onChange={setBackground} placeholder="このテーマに興味を持ったきっかけや背景を書いてください" rows={4} />
          <Textarea label="現在の仮説 *" value={hypothesis} onChange={setHypothesis} placeholder="今のところどう考えていますか？" rows={3} />
          <Textarea label="行き詰まり・聞きたいこと *" value={stuckPoint} onChange={setStuckPoint} placeholder="何につまずいていますか？有識者に何を聞きたいですか？" rows={3} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">タグ（1つ以上選択）*</label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><Spinner size="sm" />作成中...</> : '問いカードを作成する'}
          </button>
        </div>
      </div>
    </>
  )
}

function Textarea({ label, value, onChange, placeholder, rows }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; rows: number }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    </div>
  )
}
