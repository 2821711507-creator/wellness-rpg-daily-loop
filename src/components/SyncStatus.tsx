import type { SyncState } from '../hooks/useCloudWellness'

const LABELS: Partial<Record<SyncState, string>> = {
  saving: '저장 중',
  saved: '저장됨',
  waiting: '동기화 대기 중',
  conflict: '다른 기기에서 최신 정보를 저장했어요. 새로고침해서 최신 상태를 불러오세요.',
  error: '저장에 실패했어요. 다시 시도해 주세요.',
}

/**
 * Live-region sync feedback rendered in normal document flow (never `position:fixed`) so it can
 * never cover the app's fixed bottom navigation. Silent while `loading` -- the initial remote
 * fetch has its own loading screen upstream.
 */
export function SyncStatus({ state, onReloadRemote, onRetry }: { state:SyncState; onReloadRemote?:()=>void; onRetry?:()=>void }) {
  if (state === 'loading') return null
  return <div className={`sync-status sync-status--${state}`} role="status" aria-live="polite">
    <span>{LABELS[state]}</span>
    {state === 'conflict' && <button type="button" onClick={onReloadRemote}>새로고침</button>}
    {state === 'error' && <button type="button" onClick={onRetry}>다시 시도</button>}
  </div>
}
