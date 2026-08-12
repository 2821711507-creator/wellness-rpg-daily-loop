import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Onboarding } from './Onboarding'

describe('Onboarding', () => {
  it('offers a veryActive tier and defaults the goal to cut/mild', async () => {
    const onComplete = vi.fn()
    render(<Onboarding onComplete={onComplete}/>)
    expect(screen.getByRole('option', { name:'매우 활동적' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name:'시작하기' }))
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ goal:'cut', cutIntensity:'mild' }))
  })

  it('shows the cut-intensity choice only while the goal is cut', async () => {
    const onComplete = vi.fn()
    render(<Onboarding onComplete={onComplete}/>)
    expect(screen.getByLabelText('감량 강도')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('목표'), '유지')
    expect(screen.queryByLabelText('감량 강도')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name:'시작하기' }))
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ goal:'maintain' }))
    expect(onComplete.mock.calls[0][0]).not.toHaveProperty('cutIntensity')
  })

  it('submits an aggressive cut when selected', async () => {
    const onComplete = vi.fn()
    render(<Onboarding onComplete={onComplete}/>)
    await userEvent.selectOptions(screen.getByLabelText('감량 강도'), '공격적')
    await userEvent.click(screen.getByRole('button', { name:'시작하기' }))
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ goal:'cut', cutIntensity:'aggressive' }))
  })
})
