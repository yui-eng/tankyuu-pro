'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, ExpertProfile } from '@/lib/types'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageSpinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'

const COMMITMENT_LABELS: Record<string, string> = { yes: 'はい（毎週対応可）', maybe: '可能なときだけ' }

export default function ProfilePage() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [expert, setExpert] = useState<ExpertProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function uploadAvatar(file: File) {
    if (!user) return
    setUploading(true)
    setMsg('')
    const ext = file.name.split('.').pop()
    const path = `${user.id}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) { setMsg('アップロードに失敗しました: ' + upErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    // Append cache-buster to force browser refresh
    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`
    const { error: updateErr } = await supabase.from('users').update({ avatar_url: urlWithCacheBust }).eq('id', user.id)
    if (updateErr) { setMsg('プロフィール更新に失敗しました'); setUploading(false); return }
    setUser(prev => prev ? { ...prev, avatar_url: urlWithCacheBust } : prev)
    setMsg('アイコンを更新しました')
    setUploading(false)
  }

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

        {/* Avatar section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">アイコン</h2>
          <div className="flex items-center gap-5">
            <div className="relative group">
              {user && <Avatar user={user} size="xl" />}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                {uploading
                  ? <Spinner size="sm" />
                  : <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                }
              </button>
            </div>
            <div>
              <p className="text-sm text-gray-700 font-medium mb-1">プロフィールアイコン</p>
              <p className="text-xs text-gray-400 mb-2">JPG・PNG・WebP（5MB以下）</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {uploading ? 'アップロード中...' : '画像を変更'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) uploadAvatar(file)
                e.target.value = ''
              }}
            />
          </div>
          {msg && msg.includes('アイコン') && (
            <p className={`text-sm mt-3 ${msg.includes('失敗') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>
          )}
        </div>

        {/* Basic info */}
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
            {msg && !msg.includes('アイコン') && (
              <p className={`text-sm mt-3 ${msg.includes('失敗') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>
            )}
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
