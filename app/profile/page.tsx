'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, ExpertProfile } from '@/lib/types'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'

const COMMITMENT_LABELS: Record<string, string> = { yes: 'はい（毎週対応可）', maybe: '可能なときだけ' }

export default function ProfilePage() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [expert, setExpert] = useState<ExpertProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Expert form state
  const [realName, setRealName] = useState('')
  const [affiliation, setAffiliation] = useState('')
  const [facebookUrl, setFacebookUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [slackUrl, setSlackUrl] = useState('')
  const [bio, setBio] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [commitment, setCommitment] = useState('yes')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { setError('未ログインです'); setLoading(false); return }

    const { data: userData, error: userErr } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    if (userErr) { setError('ユーザー情報を取得できませんでした'); setLoading(false); return }
    setUser(userData)

    if (userData.role === 'expert') {
      const { data: ep } = await supabase.from('expert_profiles').select('*').eq('user_id', authUser.id).single()
      if (ep) {
        setExpert(ep)
        setRealName(ep.real_name ?? '')
        setAffiliation(ep.affiliation ?? '')
        setFacebookUrl(ep.facebook_url ?? '')
        setTwitterUrl(ep.twitter_url ?? '')
        setInstagramUrl(ep.instagram_url ?? '')
        setSlackUrl(ep.slack_url ?? '')
        setBio(ep.bio ?? '')
        setTagsInput((ep.tags ?? []).join(', '))
        setCommitment(ep.weekly_commitment ?? 'yes')
      }
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function saveExpertProfile() {
    if (!user) return
    setSaving(true)
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    const completed = !!(realName && affiliation && tags.length > 0)
    const { error: e } = await supabase.from('expert_profiles').upsert({
      user_id: user.id,
      real_name: realName,
      affiliation,
      facebook_url: facebookUrl || null,
      twitter_url: twitterUrl || null,
      instagram_url: instagramUrl || null,
      slack_url: slackUrl || null,
      bio,
      tags,
      weekly_commitment: commitment,
      profile_completed: completed,
    })
    if (e) { setMsg('保存に失敗しました: ' + e.message) }
    else { setMsg('保存しました'); await load() }
    setSaving(false)
  }

  if (loading) return <AppLayout user={null}><PageSpinner /></AppLayout>
  if (error) return <AppLayout user={user}><ErrorState message={error} onRetry={load} /></AppLayout>

  return (
    <AppLayout user={user}>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">プロフィール</h1>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">基本情報</h2>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2"><span className="text-gray-400 w-20">名前</span><span>{user?.name}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-20">メール</span><span>{user?.email}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-20">ロール</span>
              <Badge>{user?.role === 'student' ? '生徒' : user?.role === 'expert' ? '有識者' : '管理者'}</Badge>
            </div>
          </div>
        </div>

        {user?.role === 'expert' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-700">有識者プロフィール</h2>
              {expert?.profile_completed
                ? <Badge variant="green">プロフィール完了</Badge>
                : <Badge variant="yellow">未完了（必須項目を入力してください）</Badge>}
            </div>
            <div className="space-y-4">
              <Field label="実名 *" value={realName} onChange={setRealName} placeholder="山田 太郎" />
              <Field label="所属・肩書き *" value={affiliation} onChange={setAffiliation} placeholder="〇〇大学 教授 / 〇〇株式会社" />
              <Field label="専門タグ（カンマ区切り）*" value={tagsInput} onChange={setTagsInput} placeholder="地方創生, 教育, AI" />
              <Field label="Twitter / X URL（任意）" value={twitterUrl} onChange={setTwitterUrl} placeholder="https://x.com/yourhandle" />
              <Field label="Instagram URL（任意）" value={instagramUrl} onChange={setInstagramUrl} placeholder="https://instagram.com/yourhandle" />
              <Field label="Facebook URL（任意）" value={facebookUrl} onChange={setFacebookUrl} placeholder="https://facebook.com/yourprofile" />
              <Field label="Slack プロフィール URL（任意）" value={slackUrl} onChange={setSlackUrl} placeholder="https://app.slack.com/team/XXXXXXXXX" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">週次対応 *</label>
                <select
                  value={commitment}
                  onChange={e => setCommitment(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(COMMITMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">自己紹介（任意）</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                  placeholder="経験・得意分野など..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            {msg && <p className={`text-sm mt-3 ${msg.includes('失敗') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>}
            <button
              onClick={saveExpertProfile}
              disabled={saving}
              className="mt-4 px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <><Spinner size="sm" />保存中...</> : '保存する'}
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
