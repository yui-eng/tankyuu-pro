export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  if (!userData || userData.role !== 'admin') redirect('/')

  // KPI data
  const [
    { count: expertCount },
    { count: freeSlots },
    { count: pendingRequests },
    { count: acceptedRequests },
    { count: doneSessions },
    { count: totalSessions },
    { count: submittedLogs },
  ] = await Promise.all([
    supabase.from('expert_profiles').select('*', { count: 'exact', head: true }).eq('profile_completed', true),
    supabase.from('availability_slots').select('*', { count: 'exact', head: true }).eq('status', 'free'),
    supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('requests').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
    supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'done'),
    supabase.from('sessions').select('*', { count: 'exact', head: true }),
    supabase.from('three_line_logs').select('*', { count: 'exact', head: true }),
  ])

  const logRate = totalSessions ? Math.round((submittedLogs ?? 0) / (totalSessions ?? 1) * 100) : 0

  // Recent data
  const { data: users } = await supabase
    .from('users')
    .select('*, expert_profiles(profile_completed, real_name, affiliation)')
    .order('created_at', { ascending: false })
    .limit(20)

  const incompleteExperts = users?.filter((u: any) => u.role === 'expert' && !u.expert_profiles?.profile_completed) ?? []

  return (
    <>
      <Header user={userData} />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">管理ダッシュボード</h1>

        {/* KPI Grid */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">KPI</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="有識者数" value={expertCount ?? 0} unit="人" color="blue" />
            <KpiCard label="空き枠" value={freeSlots ?? 0} unit="枠" color="green" />
            <KpiCard label="依頼（承認待ち）" value={pendingRequests ?? 0} unit="件" color="yellow" />
            <KpiCard label="依頼（承諾済み）" value={acceptedRequests ?? 0} unit="件" color="blue" />
            <KpiCard label="セッション完了" value={doneSessions ?? 0} unit="回" color="green" />
            <KpiCard label="総セッション" value={totalSessions ?? 0} unit="回" color="gray" />
            <KpiCard label="ログ提出" value={submittedLogs ?? 0} unit="件" color="blue" />
            <KpiCard label="ログ提出率" value={logRate} unit="%" color={logRate >= 70 ? 'green' : 'yellow'} />
          </div>
        </section>

        {/* Incomplete expert profiles */}
        {incompleteExperts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              プロフィール未完了の有識者
              <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">{incompleteExperts.length}</span>
            </h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">名前</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">メール</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">登録日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {incompleteExperts.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{u.name}</td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {format(new Date(u.created_at), 'M月d日', { locale: ja })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* User list */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">ユーザー一覧</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">名前</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">ロール</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">有識者情報</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">登録日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(users ?? []).map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === 'admin' ? 'red' : u.role === 'expert' ? 'blue' : 'gray'}>
                        {u.role === 'student' ? '生徒' : u.role === 'expert' ? '有識者' : '管理者'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {u.role === 'expert' && (
                        u.expert_profiles?.profile_completed
                          ? <span className="text-green-600">{u.expert_profiles.real_name}</span>
                          : <span className="text-yellow-600">未完了</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {format(new Date(u.created_at), 'M月d日', { locale: ja })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </>
  )
}

function KpiCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600', green: 'text-green-600', yellow: 'text-yellow-600',
    red: 'text-red-600', gray: 'text-gray-500',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className={`text-3xl font-bold ${colors[color] ?? 'text-gray-900'} mb-1`}>
        {value}<span className="text-base font-normal ml-0.5">{unit}</span>
      </div>
      <div className="text-gray-500 text-sm">{label}</div>
    </div>
  )
}
