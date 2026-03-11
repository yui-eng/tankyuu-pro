'use client'
import { useState } from 'react'
import Link from 'next/link'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function fmt(dt: string) {
  const d = new Date(dt)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export function CalendarView({ sessions, slots, role }: { sessions: any[]; slots: any[]; role?: string }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<string | null>(toDateKey(today))

  // Build event map by date
  const sessionMap: Record<string, any[]> = {}
  for (const s of sessions) {
    if (!s.scheduled_at) continue
    const key = toDateKey(new Date(s.scheduled_at))
    if (!sessionMap[key]) sessionMap[key] = []
    sessionMap[key].push({ type: 'session', data: s })
  }
  const slotMap: Record<string, any[]> = {}
  for (const sl of slots) {
    const key = toDateKey(new Date(sl.start_datetime))
    if (!slotMap[key]) slotMap[key] = []
    slotMap[key].push({ type: 'slot', data: sl })
  }

  // Calendar grid
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = firstDay.getDay() // 0=Sun
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7
  const cells: (Date | null)[] = []
  for (let i = 0; i < totalCells; i++) {
    const d = i - startOffset + 1
    if (d < 1 || d > lastDay.getDate()) cells.push(null)
    else cells.push(new Date(year, month, d))
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const selectedSessions = selected ? (sessionMap[selected] ?? []) : []
  const selectedSlots = selected ? (slotMap[selected] ?? []) : []
  const todayKey = toDateKey(today)

  // Upcoming list (next 2 weeks)
  const upcoming = sessions
    .filter(s => s.scheduled_at && new Date(s.scheduled_at) >= today)
    .slice(0, 10)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">カレンダー</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900">{year}年 {MONTHS[month]}</h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={`text-center text-xs font-medium pb-2 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
                {w}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-px">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />
              const key = toDateKey(d)
              const hasSessions = !!sessionMap[key]?.length
              const hasSlots = !!slotMap[key]?.length
              const isToday = key === todayKey
              const isSelected = key === selected
              const isWeekend = d.getDay() === 0 || d.getDay() === 6
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`relative flex flex-col items-center py-1.5 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? 'bg-gray-900 text-white'
                      : isToday
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : isWeekend
                      ? 'text-gray-400 hover:bg-gray-50'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{d.getDate()}</span>
                  <div className="flex gap-0.5 mt-0.5 h-1.5">
                    {hasSessions && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />}
                    {hasSlots && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-gray-300' : 'bg-emerald-400'}`} />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-blue-500" />セッション
            </div>
            {(role === 'expert' || role === 'admin') && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />空き枠
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Selected day events */}
          {selected && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm">
                {new Date(selected + 'T00:00:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
              </h3>
              {selectedSessions.length === 0 && selectedSlots.length === 0 ? (
                <p className="text-gray-400 text-sm">予定なし</p>
              ) : (
                <ul className="space-y-2">
                  {selectedSessions.map(({ data: s }, i) => (
                    <li key={i}>
                      <Link href={`/request/${s.requests?.id}`} className="block p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-blue-600 font-medium">{fmt(s.scheduled_at)} セッション</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${s.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                            {s.status === 'done' ? '完了' : '予定'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 font-medium leading-tight">
                          {s.requests?.questions?.title ?? 'セッション'}
                        </p>
                        {s.requests?.users?.name && (
                          <p className="text-xs text-gray-500 mt-0.5">生徒: {s.requests.users.name}</p>
                        )}
                      </Link>
                    </li>
                  ))}
                  {selectedSlots.map(({ data: sl }, i) => (
                    <li key={'sl' + i}>
                      <div className="p-3 bg-emerald-50 rounded-lg">
                        <p className="text-xs text-emerald-600 font-medium">{fmt(sl.start_datetime)} 空き枠</p>
                        {sl.users?.name && <p className="text-xs text-gray-500 mt-0.5">{sl.users.name}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Upcoming sessions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">直近のセッション</h3>
            {upcoming.length === 0 ? (
              <p className="text-gray-400 text-sm">予定されているセッションはありません</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((s: any, i: number) => (
                  <li key={i}>
                    <Link href={`/request/${s.requests?.id}`} className="block hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors">
                      <p className="text-xs text-gray-400">
                        {new Date(s.scheduled_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })} {fmt(s.scheduled_at)}
                      </p>
                      <p className="text-sm text-gray-800 font-medium truncate">
                        {s.requests?.questions?.title ?? 'セッション'}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
