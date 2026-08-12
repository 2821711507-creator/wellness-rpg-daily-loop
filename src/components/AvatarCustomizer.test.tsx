import { useState } from 'react'
// @ts-expect-error Vitest runs in Node while the app-only TypeScript config intentionally omits Node globals.
import { readFileSync } from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AVATAR_DEFAULTS, AVATAR_PARTS } from '../data/avatarManifest'
import { equipItem, selectGender, selectSkin, unequipItem, type AvatarGender, type AvatarSkin, type AvatarState } from '../domain/avatar'
import { AvatarCard } from './AvatarCard'
import { AvatarCustomizer } from './AvatarCustomizer'

const avatarStyles = readFileSync('src/avatar.css', 'utf8')

const fullyUnlockedAvatar = (): AvatarState => ({ ...AVATAR_DEFAULTS, unlockedIds:AVATAR_PARTS.filter(part => part.selectionSlot !== 'base').map(part => part.id), equipped:{ ...AVATAR_DEFAULTS.equipped } })

function Harness({ onClose = vi.fn() }: { onClose?:()=>void }) {
  const [state, setState] = useState<AvatarState>(fullyUnlockedAvatar)
  return <AvatarCustomizer state={state} gameLevel={9} onGenderChange={(gender:AvatarGender) => setState(current => selectGender(current, gender))} onSkinChange={(skin:AvatarSkin) => setState(current => selectSkin(current, skin))} onEquip={id => setState(current => equipItem(current, id))} onUnequip={slot => setState(current => unequipItem(current, slot))} onClose={onClose}/>
}

function contrastRatio(foreground:string, background:string) {
  const luminance = (hex:string) => {
    const channels = hex.match(/[\da-f]{2}/gi)!.map(channel => parseInt(channel, 16) / 255).map(channel => channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
    return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2]
  }
  const values = [luminance(foreground), luminance(background)].sort((left, right) => right - left)
  return (values[0] + .05) / (values[1] + .05)
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
    for (const name of ['캐릭터 성별', '피부색', '머리', '상의', '하의', '신발', '모자', '액세서리']) expect(screen.getByRole('group', { name })).toBeInTheDocument()
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

  it('shows empty clothing choices and disables future rewards', () => {
    const handlers = { onGenderChange:vi.fn(), onSkinChange:vi.fn(), onEquip:vi.fn(), onClose:vi.fn() }
    render(<AvatarCustomizer state={AVATAR_DEFAULTS} gameLevel={1} onUnequip={vi.fn()} {...handlers}/>)
    expect(screen.getByRole('button', { name:'상의 없음' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name:/러닝복.*레벨 3/ })).toBeDisabled()
    expect(screen.getByText('다음 보상')).toBeInTheDocument()
  })

  it('limits upcoming rewards to the next three items sorted by level then ID', () => {
    const handlers = { onGenderChange:vi.fn(), onSkinChange:vi.fn(), onEquip:vi.fn(), onClose:vi.fn() }
    render(<AvatarCustomizer state={AVATAR_DEFAULTS} gameLevel={1} onUnequip={vi.fn()} {...handlers}/>)
    const rewards = within(screen.getByRole('complementary', { name:'다음 보상' })).getAllByRole('listitem')
    expect(rewards).toHaveLength(3)
    expect(rewards.map(reward => reward.textContent)).toEqual(['웨이브 머리레벨 2', '운동화레벨 2', '러닝복레벨 3'])
  })

  it('keeps a low-level owned item enabled and out of future rewards', () => {
    const handlers = { onGenderChange:vi.fn(), onSkinChange:vi.fn(), onEquip:vi.fn(), onUnequip:vi.fn(), onClose:vi.fn() }
    const state = { ...AVATAR_DEFAULTS, unlockedIds:[...AVATAR_DEFAULTS.unlockedIds, 'top-runner'] }
    render(<AvatarCustomizer state={state} gameLevel={1} {...handlers}/>)

    expect(screen.getByRole('button', { name:'러닝복' })).toBeEnabled()
    expect(within(screen.getByRole('complementary', { name:'다음 보상' })).queryByText('러닝복')).not.toBeInTheDocument()
  })

  it('keeps a high-level missing item disabled without calling an unsafe equip handler', async () => {
    const user = userEvent.setup()
    const onEquip = vi.fn(() => { throw new Error('잠긴 아이템을 장착하면 안 됩니다.') })
    render(<AvatarCustomizer state={AVATAR_DEFAULTS} gameLevel={9} onGenderChange={vi.fn()} onSkinChange={vi.fn()} onEquip={onEquip} onUnequip={vi.fn()} onClose={vi.fn()}/>)

    const trainers = screen.getByRole('button', { name:/운동화.*레벨 2/ })
    expect(trainers).toBeDisabled()
    await user.click(trainers)
    expect(onEquip).not.toHaveBeenCalled()
  })

  it('unequips optional slots and prevents locked items from equipping', async () => {
    const user = userEvent.setup()
    const onUnequip = vi.fn()
    const onEquip = vi.fn()
    render(<AvatarCustomizer state={AVATAR_DEFAULTS} gameLevel={1} onGenderChange={vi.fn()} onSkinChange={vi.fn()} onEquip={onEquip} onUnequip={onUnequip} onClose={vi.fn()}/>)
    await user.click(screen.getByRole('button', { name:'신발 없음' }))
    expect(onUnequip).toHaveBeenCalledWith('shoes')
    await user.click(screen.getByRole('button', { name:/운동화.*레벨 2/ }))
    expect(onEquip).not.toHaveBeenCalled()
  })

  it('keeps active avatar-view text at WCAG AA contrast', () => {
    const scopedTokens = avatarStyles.match(/\.app-shell:has\(>\.avatar-studio\)\{--muted:(#[\da-f]{6});--blue-strong:(#[\da-f]{6})\}/i)
    expect(scopedTokens, 'avatar view color overrides').not.toBeNull()
    const [, muted, blueStrong] = scopedTokens!
    expect(contrastRatio(muted, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(blueStrong, '#dfefff')).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps a non-overlapping integer-scale preview sticky on responsive screens', () => {
    const responsiveStyles = avatarStyles.slice(avatarStyles.indexOf('@media(max-width:1023px)'))
    expect(responsiveStyles).not.toContain('.avatar-preview-panel{position:static')
    expect(responsiveStyles).toContain('.avatar-studio{grid-template-columns:minmax(240px,320px) minmax(0,1fr);gap:12px}')
    expect(responsiveStyles).toContain('.avatar-preview-panel{top:8px;min-height:auto;padding:16px}')
    expect(responsiveStyles).toContain('.avatar-stage{min-height:304px;margin-top:12px}')
    expect(responsiveStyles).toContain('.avatar-stage .avatar-renderer{width:192px;height:288px}')
    expect(responsiveStyles).toContain('.avatar-studio{grid-template-columns:120px minmax(0,1fr);gap:8px;padding-left:12px;padding-right:12px}')
    expect(responsiveStyles).toContain('.avatar-stage .avatar-renderer{width:96px;height:144px}')
    expect(responsiveStyles).toContain('.avatar-choice-grid{grid-template-columns:1fr}')
  })

  it('distinguishes selected empty slots from dashed locked rewards', () => {
    expect(avatarStyles).toContain('.avatar-choice-grid button:disabled{cursor:not-allowed;color:var(--muted);background:var(--soft);border-style:dashed}')
    expect(avatarStyles).toContain('.avatar-empty-choice{border-style:solid!important}')
  })
})
