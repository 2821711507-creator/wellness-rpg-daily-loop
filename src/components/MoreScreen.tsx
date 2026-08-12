import { useState, type FormEvent } from 'react'
import type { AuthResult } from '../auth/authTypes'

const ROADMAP = [
  '체중 변화 추세를 계산된 목표와 비교해서, 식단·운동이 잘 맞는지 알려주는 피드백',
  '스무디 외에 하루 전체 식사를 기록할 수 있는 식단 기록 확장',
  '더 다양한 식재료와 자동으로 짜주는 주간 식단·운동 계획',
]

/** Reached from the bottom nav's "더보기" button. Always shows the roadmap; the
 * feedback form only renders when `onSubmitFeedback` is supplied, since only a
 * logged-in, cloud-connected session (see `CloudConnectedApp` in `App.tsx`) has
 * a `userId` to attach feedback to. */
export function MoreScreen({ onClose, onSubmitFeedback }: { onClose: () => void; onSubmitFeedback?: (message: string) => Promise<AuthResult<void>> }) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!onSubmitFeedback) return
    setError(null)
    setSent(false)
    setIsSubmitting(true)
    const result = await onSubmitFeedback(message)
    setIsSubmitting(false)
    if (!result.ok) { setError(result.message); return }
    setMessage('')
    setSent(true)
  }

  return <main className="more-screen">
    <header className="more-screen-header">
      <h1>더보기</h1>
      <button type="button" onClick={onClose}>돌아가기</button>
    </header>

    <section>
      <h2>추후 업데이트 예정</h2>
      <ul className="more-roadmap">
        {ROADMAP.map(item => <li key={item}>{item}</li>)}
      </ul>
    </section>

    {onSubmitFeedback && <section>
      <h2>의견 보내기</h2>
      <form onSubmit={submit}>
        <label>의견 보내기<textarea value={message} onChange={e => setMessage(e.target.value)} required/></label>
        <button type="submit" disabled={isSubmitting}>보내기</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {sent && <p role="status">의견을 보냈어요. 고마워요!</p>}
    </section>}
  </main>
}
