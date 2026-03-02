'use client'
import { useRouter } from 'next/navigation'

interface Props {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message = '表示できません', onRetry }: Props) {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="text-4xl">⚠️</div>
      <p className="text-gray-600 text-lg">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          戻る
        </button>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            再読み込み
          </button>
        )}
      </div>
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">📭</div>
      <p className="text-gray-500">{message}</p>
    </div>
  )
}
