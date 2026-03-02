import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if user profile exists
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', data.user.id)
        .single()

      if (!userProfile) {
        // New user → onboarding
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      // Existing user → role-based home
      const roleHome: Record<string, string> = {
        student: '/student/home',
        expert: '/expert/home',
        admin: '/admin',
      }
      return NextResponse.redirect(`${origin}${roleHome[userProfile.role] ?? '/'}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
