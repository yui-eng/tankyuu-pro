'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/ErrorState'

export function ExpertList({ experts }: { experts: any[] }) {
  const [query, setQuery] = useState('')

  const allTags = useMemo(() => {
    const set = new Set<string>()
    experts.forEach(e => (e.tags ?? []).forEach((t: string) => set.add(t)))
    return Array.from(set).sort()
  }, [experts])

  const [selectedTag, setSelectedTag] = useState('')

  const filtered = useMemo(() => {
    return experts.filter(e => {
      const matchQuery = !query ||
        e.real_name?.toLowerCase().includes(query.toLowerCase()) ||
        e.affiliation?.toLowerCase().includes(query.toLowerCase()) ||
        (e.tags ?? []).some((t: string) => t.toLowerCase().includes(query.toLowerCase()))
      const matchTag = !selectedTag || (e.tags ?? []).includes(selectedTag)
      return matchQuery && matchTag
    })
  }, [experts, query, selectedTag])

  return (
    <>
      {/* 検索バー */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="名前・所属・タグで検索..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {allTags.length > 0 && (
          <select
            value={selectedTag}
            onChange={e => setSelectedTag(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">すべてのタグ</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {/* 件数 */}
      {(query || selectedTag) && (
        <p className="text-sm text-gray-500 mb-4">{filtered.length} 件見つかりました</p>
      )}

      {!filtered.length ? (
        <EmptyState message={query || selectedTag ? '条件に一致する有識者が見つかりません' : '現在登録中の有識者はいません。しばらくお待ちください。'} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((e: any) => (
            <Link key={e.user_id} href={`/experts/${e.user_id}`}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow h-full">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h2 className="font-semibold text-gray-900">{e.real_name}</h2>
                    <p className="text-gray-500 text-sm">{e.affiliation}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-blue-600 font-bold text-lg">{e.slotCount}</div>
                    <div className="text-gray-400 text-xs">空き枠</div>
                  </div>
                </div>
                {e.bio && <p className="text-gray-600 text-sm line-clamp-2 mb-3">{e.bio}</p>}
                <div className="flex flex-wrap gap-1">
                  {(e.tags ?? []).slice(0, 4).map((t: string) => (
                    <span
                      key={t}
                      onClick={ev => { ev.preventDefault(); setSelectedTag(t === selectedTag ? '' : t) }}
                      className={`text-xs px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                        t === selectedTag ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
