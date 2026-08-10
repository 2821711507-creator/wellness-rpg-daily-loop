# Checklist MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished local-first checklist web app where a user can add, complete, delete, prioritize, categorize, and review today's tasks.

**Architecture:** React components consume task state only through `useTasks`; pure domain functions handle validation, ordering, and progress calculations; a `TaskRepository` boundary isolates persistence. The first repository implementation uses versioned `localStorage`, allowing a later server-backed implementation without changing UI components.

**Tech Stack:** React 19, TypeScript 5, Vite 7, Vitest, Testing Library, user-event, jsdom, CSS custom properties, Lucide React.

## Global Constraints

- The first release is a login-free, local-first web app.
- Phase 1 includes add, complete, delete, category, priority, ordering, local persistence, and progress only.
- Phase 1 excludes edit, filters, due dates, recurrence, historical analytics, accounts, and sync.
- Categories are `work`, `life`, and `habit`; priorities are `high`, `medium`, and `low`.
- Desktop uses an approximately 70:30 two-column layout; mobile stacks progress below the list.
- Status, category, and priority must never be communicated by color alone.
- All primary actions must work with a keyboard and have visible focus treatment.
- Respect `prefers-reduced-motion`.
- Do not ship fabricated achievements, usage counts, or performance data.

## Planned File Structure

```text
index.html                         Vite document shell and Korean metadata
package.json                       scripts and dependency versions
vite.config.ts                     Vite and Vitest configuration
tsconfig.json                      TypeScript project references
tsconfig.app.json                  browser compiler settings
tsconfig.node.json                 Vite configuration compiler settings
src/main.tsx                       React entry point
src/App.tsx                        repository wiring and app-level error state
src/styles.css                     responsive cyclorama visual system
src/domain/task.ts                 task types, validation, sorting, progress
src/domain/task.test.ts            pure domain tests
src/repositories/taskRepository.ts persistence contract and load result
src/repositories/localStorageTaskRepository.ts versioned browser persistence
src/repositories/localStorageTaskRepository.test.ts persistence tests
src/hooks/useTasks.ts              task state and mutation orchestration
src/hooks/useTasks.test.tsx        hook behavior and failure tests
src/components/AppShell.tsx        time theme and page layout
src/components/TodayHeader.tsx     date, greeting, progress summary
src/components/QuickAddForm.tsx    accessible task creation form
src/components/TaskList.tsx        sorted list and empty state
src/components/TaskItem.tsx        completion and deletion controls
src/components/ProgressPanel.tsx   overall and category progress
src/components/AppFlow.test.tsx    user-level integration tests
src/test/setup.ts                  jest-dom registration and cleanup
```

---

### Task 1: Project Foundation and Test Harness

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/test/setup.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: none
- Produces: `npm run dev`, `npm run build`, and `npm test`; React root mounted at `#root`

- [ ] **Step 1: Create the package manifest and test configuration**

```json
{
  "name": "iim-checklist",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "lucide-react": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "jsdom": "latest",
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest"
  }
}
```

Configure Vitest in `vite.config.ts` with `environment: 'jsdom'`, `setupFiles: './src/test/setup.ts'`, `clearMocks: true`, and React plugin support. Configure TypeScript with strict mode and project references for the app and Vite config.

- [ ] **Step 2: Create the smallest render smoke test**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the product heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: '오늘의 흐름' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Install dependencies and verify the test fails**

Run: `npm install && npm test -- src/App.test.tsx`

Expected: FAIL because `src/App.tsx` and the heading do not exist.

- [ ] **Step 4: Add the minimal React shell**

```tsx
// src/App.tsx
export function App() {
  return <h1>오늘의 흐름</h1>
}
```

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)
```

Create `index.html` with `lang="ko"`, viewport metadata, title `오늘의 흐름`, and `<div id="root"></div>`. In `src/test/setup.ts`, import `@testing-library/jest-dom/vitest` and run Testing Library cleanup after each test. Create an empty `src/styles.css`.

- [ ] **Step 5: Verify the harness and production build**

Run: `npm test -- src/App.test.tsx && npm run build`

Expected: one passing test and a successful Vite production build.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json index.html vite.config.ts tsconfig*.json src
git commit -m "chore: scaffold checklist app"
```

---

### Task 2: Task Domain Rules

**Files:**
- Create: `src/domain/task.ts`
- Create: `src/domain/task.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `Task`, `TaskCategory`, `TaskPriority`, `createTask`, `sortTasks`, `calculateProgress`

- [ ] **Step 1: Write failing domain tests**

```ts
import { describe, expect, it } from 'vitest'
import { calculateProgress, createTask, sortTasks, type Task } from './task'

const task = (overrides: Partial<Task>): Task => ({
  id: '1', title: '기본 할 일', completed: false, category: 'work',
  priority: 'medium', createdAt: '2026-08-10T00:00:00.000Z', ...overrides,
})

describe('task domain', () => {
  it('trims a valid title', () => {
    expect(createTask({ title: '  보고서 작성  ', category: 'work', priority: 'high' }, 'id-1', '2026-08-10T00:00:00.000Z').title)
      .toBe('보고서 작성')
  })

  it('rejects a blank title', () => {
    expect(() => createTask({ title: '   ', category: 'life', priority: 'low' }, 'id-1', '2026-08-10T00:00:00.000Z'))
      .toThrow('제목을 입력해 주세요.')
  })

  it('sorts incomplete before complete, then by priority', () => {
    const result = sortTasks([
      task({ id: 'low', priority: 'low' }),
      task({ id: 'done', priority: 'high', completed: true }),
      task({ id: 'high', priority: 'high' }),
    ])
    expect(result.map(({ id }) => id)).toEqual(['high', 'low', 'done'])
  })

  it('calculates overall and category progress', () => {
    const result = calculateProgress([
      task({ id: '1', category: 'work', completed: true }),
      task({ id: '2', category: 'work' }),
      task({ id: '3', category: 'habit', completed: true }),
    ])
    expect(result.overall).toEqual({ completed: 2, total: 3, percentage: 67 })
    expect(result.categories.habit).toEqual({ completed: 1, total: 1, percentage: 100 })
    expect(result.categories.life).toEqual({ completed: 0, total: 0, percentage: 0 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/domain/task.test.ts`

Expected: FAIL because `./task` does not exist.

- [ ] **Step 3: Implement the domain model and pure functions**

Define the exact types:

```ts
export type TaskCategory = 'work' | 'life' | 'habit'
export type TaskPriority = 'high' | 'medium' | 'low'
export interface Task { id: string; title: string; completed: boolean; category: TaskCategory; priority: TaskPriority; createdAt: string }
export interface NewTaskInput { title: string; category: TaskCategory; priority: TaskPriority }
export interface ProgressCount { completed: number; total: number; percentage: number }
export interface TaskProgress { overall: ProgressCount; categories: Record<TaskCategory, ProgressCount> }
```

Implement `createTask(input, id = crypto.randomUUID(), createdAt = new Date().toISOString())`, a non-mutating `sortTasks(tasks)`, and `calculateProgress(tasks)`. Priority weights are high `0`, medium `1`, low `2`; equal items keep creation order. Percentages use `Math.round`, with zero total producing zero percent.

- [ ] **Step 4: Run tests and type-check**

Run: `npm test -- src/domain/task.test.ts && npm run build`

Expected: four passing tests and a successful build.

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "feat: add task domain rules"
```

---

### Task 3: Versioned Local Storage Repository

**Files:**
- Create: `src/repositories/taskRepository.ts`
- Create: `src/repositories/localStorageTaskRepository.ts`
- Create: `src/repositories/localStorageTaskRepository.test.ts`

**Interfaces:**
- Consumes: `Task` from `src/domain/task.ts`
- Produces: `TaskRepository`, `TaskLoadResult`, `LocalStorageTaskRepository`

- [ ] **Step 1: Define the contract and failing persistence tests**

```ts
// taskRepository.ts
import type { Task } from '../domain/task'
export interface TaskLoadResult { tasks: Task[]; recovered: boolean }
export interface TaskRepository {
  load(): TaskLoadResult
  save(tasks: Task[]): void
}
```

Test that the repository returns `[]` for a missing key, round-trips valid tasks under `{ version: 1, tasks }`, returns `{ tasks: [], recovered: true }` for malformed JSON or invalid task properties, and propagates a storage quota error from `save`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/repositories/localStorageTaskRepository.test.ts`

Expected: FAIL because `LocalStorageTaskRepository` is missing.

- [ ] **Step 3: Implement validation and persistence**

```ts
export class LocalStorageTaskRepository implements TaskRepository {
  constructor(private storage: Storage, private key = 'iim.tasks.v1') {}

  load(): TaskLoadResult {
    const raw = this.storage.getItem(this.key)
    if (raw === null) return { tasks: [], recovered: false }
    try {
      const payload: unknown = JSON.parse(raw)
      return isPayload(payload)
        ? { tasks: payload.tasks, recovered: false }
        : { tasks: [], recovered: true }
    } catch {
      return { tasks: [], recovered: true }
    }
  }

  save(tasks: Task[]): void {
    this.storage.setItem(this.key, JSON.stringify({ version: 1, tasks }))
  }
}
```

Implement `isPayload` without casts that bypass validation. Validate every task field, category, priority, boolean state, and parseable ISO timestamp.

- [ ] **Step 4: Run repository and full tests**

Run: `npm test -- src/repositories/localStorageTaskRepository.test.ts && npm test`

Expected: all repository cases and the complete suite pass.

- [ ] **Step 5: Commit**

```bash
git add src/repositories
git commit -m "feat: persist tasks locally"
```

---

### Task 4: Task State Hook and Failure Recovery

**Files:**
- Create: `src/hooks/useTasks.ts`
- Create: `src/hooks/useTasks.test.tsx`

**Interfaces:**
- Consumes: `TaskRepository`, `createTask`, `sortTasks`, `NewTaskInput`
- Produces: `useTasks(repository)` returning `{ tasks, notice, addTask, toggleTask, deleteTask, retrySave, dismissNotice }`

- [ ] **Step 1: Write hook behavior tests**

Use a memory repository test double. Verify initial loading and recovery notice, successful add/toggle/delete, and save failure behavior. A failing save must keep the optimistic in-memory tasks and expose `저장하지 못했습니다. 다시 시도해 주세요.`; `retrySave` must persist the current tasks and clear that notice.

```tsx
const { result } = renderHook(() => useTasks(repository))
act(() => result.current.addTask({ title: '운동', category: 'habit', priority: 'medium' }))
expect(result.current.tasks[0].title).toBe('운동')
expect(repository.saved[0].title).toBe('운동')
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/hooks/useTasks.test.tsx`

Expected: FAIL because `useTasks` does not exist.

- [ ] **Step 3: Implement the hook**

Initialize once from `repository.load()`. Apply each mutation through one helper that calculates the next array, updates React state, then attempts `repository.save(next)`. Do not roll state back on save errors. Return tasks through `sortTasks`; use stable callbacks; expose the recovery notice `손상된 저장 데이터를 복구하고 빈 목록으로 시작했습니다.`.

- [ ] **Step 4: Run hook and full tests**

Run: `npm test -- src/hooks/useTasks.test.tsx && npm test`

Expected: all hook failure/retry and full-suite tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks
git commit -m "feat: orchestrate task state"
```

---

### Task 5: Accessible Checklist User Flow

**Files:**
- Create: `src/components/QuickAddForm.tsx`
- Create: `src/components/TaskItem.tsx`
- Create: `src/components/TaskList.tsx`
- Create: `src/components/ProgressPanel.tsx`
- Create: `src/components/TodayHeader.tsx`
- Create: `src/components/AppFlow.test.tsx`
- Modify: `src/App.tsx`
- Remove: `src/App.test.tsx`

**Interfaces:**
- Consumes: `Task`, `NewTaskInput`, `TaskProgress`, and `useTasks`
- Produces: complete add, complete, delete, empty-state, progress, notice, and retry flow

- [ ] **Step 1: Write the user-flow integration tests**

Render `App` with a memory `TaskRepository`. Verify:

```tsx
await user.type(screen.getByLabelText('할 일 제목'), '보고서 작성')
await user.selectOptions(screen.getByLabelText('분류'), 'work')
await user.selectOptions(screen.getByLabelText('우선순위'), 'high')
await user.click(screen.getByRole('button', { name: '할 일 추가' }))
expect(screen.getByText('보고서 작성')).toBeInTheDocument()
expect(screen.getByText('0% 완료')).toBeInTheDocument()

await user.click(screen.getByRole('checkbox', { name: '보고서 작성 완료' }))
expect(screen.getByText('100% 완료')).toBeInTheDocument()

await user.click(screen.getByRole('button', { name: '보고서 작성 삭제' }))
expect(screen.getByText('오늘의 첫 장면을 만들어보세요')).toBeInTheDocument()
```

Also verify Enter submission, blank-title inline error, and save-error retry.

- [ ] **Step 2: Run the integration test to verify it fails**

Run: `npm test -- src/components/AppFlow.test.tsx`

Expected: FAIL because the UI components do not exist.

- [ ] **Step 3: Implement focused components**

`QuickAddForm` owns draft title/category/priority and renders labels for all controls. It catches the domain validation error, renders it with `role="alert"`, and retains focus. `TaskItem` uses a native checkbox plus text labels for category and priority, and a button whose accessible name includes the task title. `TaskList` renders the exact empty-state copy. `ProgressPanel` renders `N% 완료`, overall counts, and all three category counts. `TodayHeader` receives `now?: Date` for deterministic tests and uses Korean date formatting and four time-based greetings.

- [ ] **Step 4: Wire the app to the repository boundary**

```tsx
export interface AppProps { repository?: TaskRepository }

export function App({ repository = new LocalStorageTaskRepository(window.localStorage) }: AppProps) {
  const tasks = useTasks(repository)
  const progress = calculateProgress(tasks.tasks)
  return (
    <main>
      <TodayHeader progress={progress.overall} />
      <QuickAddForm onAdd={tasks.addTask} />
      {tasks.notice && <div role="status">{tasks.notice}</div>}
      <TaskList tasks={tasks.tasks} onToggle={tasks.toggleTask} onDelete={tasks.deleteTask} />
      <ProgressPanel progress={progress} />
    </main>
  )
}
```

Render a retry button only for the save-failure notice and a dismiss button for both notices.

- [ ] **Step 5: Run integration and full tests**

Run: `npm test -- src/components/AppFlow.test.tsx && npm test`

Expected: all user flows and the full suite pass.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components src/App.test.tsx
git commit -m "feat: add checklist user flow"
```

---

### Task 6: Cyclorama Visual System and Responsive Layout

**Files:**
- Create: `src/components/AppShell.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/components/AppFlow.test.tsx`

**Interfaces:**
- Consumes: all phase-one UI components
- Produces: responsive 70:30 desktop layout, stacked mobile layout, four time themes, visible focus, reduced motion

- [ ] **Step 1: Add structural and time-theme assertions**

Render with a fixed morning date and assert the shell has `data-time-theme="morning"`. Assert the main content and progress regions have accessible labels `오늘의 할 일` and `오늘의 진행 상황`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/components/AppFlow.test.tsx -t "time theme"`

Expected: FAIL because `AppShell` and semantic regions are missing.

- [ ] **Step 3: Implement AppShell and time theme selection**

```ts
export function getTimeTheme(hour: number): 'dawn' | 'morning' | 'day' | 'evening' {
  if (hour < 6) return 'dawn'
  if (hour < 11) return 'morning'
  if (hour < 18) return 'day'
  return 'evening'
}
```

`AppShell` accepts `now?: Date`, applies the theme data attribute, renders the decorative cyclorama as `aria-hidden="true"`, and exposes two semantic regions. Pass the same `now` to `TodayHeader`.

- [ ] **Step 4: Build the visual system in CSS**

Define theme variables for canvas, surface, text, muted text, accent, border, and glow. Use layered radial gradients only on the decorative background; keep cards on high-contrast opaque or strongly translucent surfaces. Use a 70:30 CSS grid above `900px`, one column below it, `min-height: 100dvh`, 44px minimum controls, `:focus-visible` outlines, line-through plus label change for completed tasks, and `@media (prefers-reduced-motion: reduce)` to remove nonessential transitions. Do not import external font files; use a Korean-capable system stack.

- [ ] **Step 5: Verify behavior and production output**

Run: `npm test && npm run build`

Expected: complete test suite passes and Vite build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/AppShell.tsx src/components/AppFlow.test.tsx src/styles.css
git commit -m "feat: add cyclorama interface"
```

---

### Task 7: Browser QA and Release Verification

**Files:**
- Modify: only files required by defects discovered during QA
- Modify: `README.md`

**Interfaces:**
- Consumes: completed phase-one app
- Produces: documented local setup and verified desktop/mobile experience

- [ ] **Step 1: Add concise setup documentation**

Create `README.md` with product purpose, phase-one features, exclusions, `npm install`, `npm run dev`, `npm test`, and `npm run build`. State that data remains in the current browser's local storage.

- [ ] **Step 2: Run automated release checks**

Run: `npm test && npm run build`

Expected: zero failing tests and a successful production build.

- [ ] **Step 3: Inspect the app in a real browser**

Run: `npm run dev -- --host 127.0.0.1`

Check at approximately 1440×900 and 390×844:

- add one task in each category and priority
- submit once with Enter
- confirm incomplete-first and priority ordering
- complete and delete tasks
- reload and confirm restoration
- verify empty, partial-progress, and 100%-complete states
- tab through every interactive control and confirm visible focus
- enable reduced motion and confirm decorative motion is removed
- inspect dawn, morning, day, and evening themes by temporarily injecting fixed `now` values in development, then remove the injection

- [ ] **Step 4: Fix any discovered defects with regression tests**

For each defect, first add a focused failing test, run it to confirm failure, make the smallest fix, then rerun that test and the full suite. Do not make untested behavior changes.

- [ ] **Step 5: Run final verification**

Run: `npm test && npm run build && git diff --check && git status --short`

Expected: all tests pass, build succeeds, no whitespace errors, and only `README.md` plus intentional QA fixes are uncommitted.

- [ ] **Step 6: Commit**

```bash
git add README.md src
git commit -m "docs: add checklist usage guide"
```

