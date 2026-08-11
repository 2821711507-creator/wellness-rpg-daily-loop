import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AVATAR_DEFAULTS } from '../data/avatarManifest'
import { equipItem, selectGender, selectSkin, type AvatarGender, type AvatarSkin, type AvatarState } from '../domain/avatar'
import { AvatarCard } from './AvatarCard'
import { AvatarCustomizer } from './AvatarCustomizer'

function Harness({ onClose = vi.fn() }: { onClose?:()=>void }) {
  const [state, setState] = useState<AvatarState>(AVATAR_DEFAULTS)
  return <AvatarCustomizer state={state} onGenderChange={(gender:AvatarGender) => setState(current => selectGender(current, gender))} onSkinChange={(skin:AvatarSkin) => setState(current => selectSkin(current, skin))} onEquip={id => setState(current => equipItem(current, id))} onClose={onClose}/>
}

describe('layered avatar UI', () => {
  it('replaces the temporary CSS figure in the Today card', () => {
    const { container } = render(<AvatarCard state={AVATAR_DEFAULTS} level={1} xp={32} coins={80} onCustomize={vi.fn()}/>)
    expect(container.querySelector('.pixel-hero')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name:/남성 캐릭터, 중간 피부/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name:'캐릭터 꾸미기' })).toBeInTheDocument()
  })

  it('offers labelled, pressed appearance choices and updates the preview', async () => {
    const user = userEvent.setup()
    render(<Harness/>)
    for (const name of ['캐릭터 성별', '피부색', '머리', '상의', '하의', '신발']) expect(screen.getByRole('group', { name })).toBeInTheDocument()
    expect(screen.getByRole('button', { name:'남성 캐릭터' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name:'여성 캐릭터' }))
    await user.click(screen.getByRole('button', { name:'짙은 피부' }))
    await user.click(screen.getByRole('button', { name:'웨이브 머리' }))
    await user.click(screen.getByRole('button', { name:'산보복' }))
    expect(screen.getByRole('img', { name:/여성 캐릭터, 짙은 피부, 웨이브 머리, 산보복/ })).toBeInTheDocument()
  })

  it('closes with Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Harness onClose={onClose}/>)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })
})
