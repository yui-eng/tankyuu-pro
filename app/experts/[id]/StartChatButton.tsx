import Link from 'next/link'

export function StartChatButton({ expertId }: { expertId: string }) {
  return (
    <Link
      href={`/dm/${expertId}`}
      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors inline-block"
    >
      メッセージを送る
    </Link>
  )
}
