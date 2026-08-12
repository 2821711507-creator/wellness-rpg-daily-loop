import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MoreScreen } from './MoreScreen'

describe('MoreScreen', () => {
  it('shows the roadmap of upcoming updates', () => {
    render(<MoreScreen onClose={() => {}}/>)

    expect(screen.getByRole('heading', { name: '더보기' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '추후 업데이트 예정' })).toBeInTheDocument()
  })

  it('closes when the back button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<MoreScreen onClose={onClose}/>)

    await user.click(screen.getByRole('button', { name: '돌아가기' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('does not show a feedback form when no submit handler is given', () => {
    render(<MoreScreen onClose={() => {}}/>)

    expect(screen.queryByRole('button', { name: '보내기' })).not.toBeInTheDocument()
  })

  it('submits feedback and shows a confirmation', async () => {
    const user = userEvent.setup()
    const onSubmitFeedback = vi.fn().mockResolvedValue({ ok: true, value: undefined })
    render(<MoreScreen onClose={() => {}} onSubmitFeedback={onSubmitFeedback}/>)

    await user.type(screen.getByLabelText('의견 보내기'), '운동 종류를 늘려주세요')
    await user.click(screen.getByRole('button', { name: '보내기' }))

    expect(onSubmitFeedback).toHaveBeenCalledWith('운동 종류를 늘려주세요')
    expect(await screen.findByRole('status')).toHaveTextContent('의견을 보냈어요. 고마워요!')
    expect(screen.getByLabelText('의견 보내기')).toHaveValue('')
  })

  it('shows an error and keeps the message when submitting feedback fails', async () => {
    const user = userEvent.setup()
    const onSubmitFeedback = vi.fn().mockResolvedValue({ ok: false, code: 'unknown', message: '피드백을 보내지 못했어요.' })
    render(<MoreScreen onClose={() => {}} onSubmitFeedback={onSubmitFeedback}/>)

    await user.type(screen.getByLabelText('의견 보내기'), '별점 기능도 있으면 좋겠어요')
    await user.click(screen.getByRole('button', { name: '보내기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('피드백을 보내지 못했어요.')
    expect(screen.getByLabelText('의견 보내기')).toHaveValue('별점 기능도 있으면 좋겠어요')
  })
})
