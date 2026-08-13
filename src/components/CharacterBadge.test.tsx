import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CharacterBadge } from './CharacterBadge'

describe('CharacterBadge', () => {
  it('shows level, xp, and coins without an avatar portrait', () => {
    render(<CharacterBadge level={3} xp={42} coins={80} onCustomize={vi.fn()}/>)

    expect(screen.getByText('레벨 3')).toBeInTheDocument()
    expect(screen.getByText('42/100 XP · 80 코인')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('opens the customizer when clicked', async () => {
    const user = userEvent.setup()
    const onCustomize = vi.fn()
    render(<CharacterBadge level={1} xp={0} coins={0} onCustomize={onCustomize}/>)

    await user.click(screen.getByRole('button', { name:'캐릭터 꾸미기' }))

    expect(onCustomize).toHaveBeenCalled()
  })
})
