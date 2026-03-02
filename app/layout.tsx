import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'QUEST – 探求×有識者プラットフォーム',
  description: '生徒の探求活動を有識者がサポートするプラットフォーム',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
