import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AVATAR_DEFAULTS, AVATAR_PARTS } from '../data/avatarManifest'
import { AVATAR_PIXEL_LAYERS } from '../data/avatarPixelLayers'
import { equipItem, getAvatarLayerIds, selectGender, selectSkin } from '../domain/avatar'
import { AvatarRenderer } from './AvatarRenderer'

describe('AvatarRenderer', () => {
  it('renders the default combination as an accessible crisp SVG', () => {
    render(<AvatarRenderer state={AVATAR_DEFAULTS}/>)
    const avatar = screen.getByRole('img', { name:'남성 캐릭터, 중간 피부, 짧은 머리, 러닝복, 트레이닝 바지, 운동화' })
    expect(avatar).toHaveAttribute('viewBox', '0 0 32 48')
    expect(avatar).toHaveAttribute('shape-rendering', 'crispEdges')
  })

  it('renders changed selections in fixed layer order', () => {
    let state = selectSkin(selectGender(AVATAR_DEFAULTS, 'female'), 'deep')
    for (const id of ['hair-wave', 'top-walk', 'bottom-shorts', 'shoes-walk']) state = equipItem(state, id)
    const { container } = render(<AvatarRenderer state={state}/>)
    expect(screen.getByRole('img', { name:'여성 캐릭터, 짙은 피부, 웨이브 머리, 산보복, 반바지, 워킹화' })).toBeInTheDocument()
    expect([...container.querySelectorAll('[data-layer-id]')].map(node => node.getAttribute('data-layer-id'))).toEqual(getAvatarLayerIds(state))
  })

  it('keeps every original pixel rectangle within the logical canvas', () => {
    const requiredLayerIds = new Set(AVATAR_PARTS.flatMap(part => part.layerIds ?? [part.id]))
    for (const id of requiredLayerIds) {
      const rects = AVATAR_PIXEL_LAYERS[id]
      expect(rects?.length, id).toBeGreaterThan(0)
      for (const rect of rects) {
        expect(rect.x, id).toBeGreaterThanOrEqual(0)
        expect(rect.y, id).toBeGreaterThanOrEqual(0)
        expect(rect.width, id).toBeGreaterThan(0)
        expect(rect.height, id).toBeGreaterThan(0)
        expect(rect.x + rect.width, id).toBeLessThanOrEqual(32)
        expect(rect.y + rect.height, id).toBeLessThanOrEqual(48)
      }
    }
  })
})
