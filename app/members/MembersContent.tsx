'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'

function ExpertCard({ e }: { e: any }) {
  const name = e.real_name || e.users?.name || '?'
  const avatarUser = { id: e.user_id, name, avatar_url: e.users?.avatar_url }
  return (
    <Link href={`/experts/${e.user_id}`} className="flex flex-col items-center text-center p-5 rounded-2xl hover:bg-white hover:shadow-sm transition-all group cursor-pointer">
      <div className="mb-3 group-hover:scale-105 transition-transform">
        <Avatar user={avatarUser} size="xl" />
      </div>
      <p className="font-semibold text-gray-900 mb-2 leading-tight">{name}</p>
      <div className="flex flex-wrap justify-center gap-1 mb-2">
        {(e.tags ?? []).slice(0, 3).map((t: string) => (
          <span key={t} className="text-xs bg-gray-900 text-white px-2.5 py-0.5 rounded-full">{t}</span>
        ))}
      </div>
      {e.affiliation && (
        <p className="text-xs text-gray-400 truncate w-full">{e.affiliation}</p>
      )}
    </Link>
  )
}

function StudentCard({ s }: { s: any }) {
  return (
    <div className="flex flex-col items-center text-center p-5 rounded-2xl">
      <div className="mb-3">
        <Avatar user={s} size="xl" />
      </div>
      <p className="font-semibold text-gray-900 mb-1">{s.name}</p>
      {s.student_profiles?.school && (
        <p className="text-xs text-gray-500">{s.student_profiles.school}</p>
      )}
      {s.student_profiles?.grade && (
        <p className="text-xs text-gray-400">{s.student_profiles.grade}</p>
      )}
    </div>
  )
}

export function MembersContent({ experts, students }: { experts: any[]; students: any[] }) {
  const [tab, setTab] = useState<'expert' | 'student'>('expert')
  const [search, setSearch] = useState('')

  const filteredExperts = experts.filter(e => {
    const q = search.toLowerCase()
    return (
      (e.real_name ?? '').toLowerCase().includes(q) ||
      (e.affiliation ?? '').toLowerCase().includes(q) ||
      (e.tags ?? []).some((t: string) => t.toLowerCase().includes(q))
    )
  })

  const filteredStudents = students.filter(s =>
    (s.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Members</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setTab('expert')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'expert' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          有識者 <span className="ml-1 text-xs text-gray-400">({experts.length})</span>
        </button>
        <button
          onClick={() => setTab('student')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'student' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          生徒 <span className="ml-1 text-xs text-gray-400">({students.length})</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
        </svg>
        <input
          type="text"
          placeholder="検索..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {tab === 'expert' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredExperts.map((e: any) => (
            <ExpertCard key={e.user_id} e={e} />
          ))}
          {!filteredExperts.length && (
            <p className="col-span-4 text-center text-gray-400 py-20">
              {search ? '該当する有識者がいません' : 'まだ登録された有識者がいません'}
            </p>
          )}
        </div>
      )}

      {tab === 'student' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredStudents.map((s: any) => (
            <StudentCard key={s.id} s={s} />
          ))}
          {!filteredStudents.length && (
            <p className="col-span-4 text-center text-gray-400 py-20">
              {search ? '該当する生徒がいません' : 'まだ登録された生徒がいません'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
