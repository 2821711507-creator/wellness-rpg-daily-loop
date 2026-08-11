import { render, screen } from '@testing-library/react'
// @ts-expect-error Vitest runs in Node while the app-only TypeScript config intentionally omits Node globals.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AVATAR_DEFAULTS, AVATAR_PARTS } from '../data/avatarManifest'
import { AVATAR_FACE_FEATURES, AVATAR_PIXEL_LAYERS } from '../data/avatarPixelLayers'
import { getAvatarLayerIds, type AvatarSelectionSlot, type AvatarState } from '../domain/avatar'
import { AvatarRenderer } from './AvatarRenderer'

const appStyles = readFileSync('src/styles.css', 'utf8')

describe('AvatarRenderer', () => {
  it('renders the premium 96 by 144 grid and non-empty face groups for both genders', () => {
    const { rerender } = render(<AvatarRenderer state={AVATAR_DEFAULTS}/>)
    for (const gender of ['male', 'female'] as const) {
      rerender(<AvatarRenderer state={{ ...AVATAR_DEFAULTS, gender }}/>)
      const avatar = screen.getByRole('img', { name:new RegExp(gender === 'male' ? '^남성 캐릭터' : '^여성 캐릭터') })
      expect(avatar).toHaveAttribute('viewBox', '0 0 96 144')
      expect(avatar).toHaveAttribute('shape-rendering', 'crispEdges')
      for (const feature of AVATAR_FACE_FEATURES) {
        expect(avatar.querySelector(`[data-face-feature="${feature}"]`)?.querySelectorAll('rect').length, `${gender} ${feature}`).toBeGreaterThan(0)
      }
    }
  })

  it('uses only exact integer scales for the Today avatar card', () => {
    expect(appStyles).toContain('.avatar-renderer{display:block;width:96px;height:144px')
    expect(appStyles).toContain('.avatar-card .avatar-renderer{width:192px;height:288px}')
    expect(appStyles).toContain('@media(max-width:560px){.avatar-card .avatar-renderer{width:96px;height:144px}}')
    expect(appStyles).not.toContain('width:128px;height:192px')
  })

  it('keeps the compact Today avatar and progress copy side by side', () => {
    const compactStyles = appStyles.slice(appStyles.indexOf('@media(max-width:390px)'))
    expect(compactStyles).not.toContain('.avatar-card{flex-direction:column}')
  })

  it('renders no optional clothing or shoes for defaults', () => {
    render(<AvatarRenderer state={AVATAR_DEFAULTS}/>)
    const avatar = screen.getByRole('img')
    expect(avatar.querySelector('[data-layer-id^="top-"]')).toBeNull()
    expect(avatar.querySelector('[data-layer-id^="bottom-"]')).toBeNull()
    expect(avatar.querySelector('[data-layer-id^="shoes-"]')).toBeNull()
  })

  it('renders changed selections in fixed layer order', () => {
    const state:AvatarState = {
      ...AVATAR_DEFAULTS,
      gender:'female',
      skin:'deep',
      unlockedIds:AVATAR_PARTS.map(part => part.id),
      equipped:{
        hair:'hair-wave', top:'top-walk', bottom:'bottom-shorts', shoes:'shoes-walk',
        hat:'hat-wellness-cap', accessory:'accessory-bottle-pouch',
      },
    }
    const { container } = render(<AvatarRenderer state={state}/>)
    expect(screen.getByRole('img', { name:'여성 캐릭터, 짙은 피부, 웨이브 머리, 산보복, 반바지, 워킹화, 웰니스 캡, 물병 크로스백' })).toBeInTheDocument()
    expect([...container.querySelectorAll('[data-layer-id]')].map(node => node.getAttribute('data-layer-id'))).toEqual(getAvatarLayerIds(state))
  })

  it('resolves the complete manifest combination matrix to existing layers', () => {
    const allIds = AVATAR_PARTS.map(part => part.id)
    const parts = (slot:AvatarSelectionSlot) => AVATAR_PARTS.filter(part => part.selectionSlot === slot)
    const optional = (slot:'top'|'bottom'|'shoes'|'hat'|'accessory') => [undefined, ...parts(slot)]
    let combinations = 0

    for (const gender of ['male', 'female'] as const) for (const skin of ['light', 'medium', 'deep'] as const) {
      for (const hair of parts('hair')) for (const top of optional('top')) for (const bottom of optional('bottom')) {
        for (const shoes of optional('shoes')) for (const hat of optional('hat')) for (const accessory of optional('accessory')) {
          const state:AvatarState = {
            gender,
            skin,
            unlockedIds:allIds,
            equipped:{
              hair:hair.id,
              ...(top ? { top:top.id } : {}),
              ...(bottom ? { bottom:bottom.id } : {}),
              ...(shoes ? { shoes:shoes.id } : {}),
              ...(hat ? { hat:hat.id } : {}),
              ...(accessory ? { accessory:accessory.id } : {}),
            },
          }
          const expected = [
            ...(hair.layerIds?.slice(0, 1) ?? []),
            `base-${gender}`,
            ...(bottom ? bottom.layerIds ?? [bottom.id] : []),
            ...(top ? top.layerIds ?? [top.id] : []),
            ...(shoes ? shoes.layerIds ?? [shoes.id] : []),
            ...(hair.layerIds?.slice(1) ?? [hair.id]),
            ...(hat ? hat.layerIds ?? [hat.id] : []),
            ...(accessory ? accessory.layerIds ?? [accessory.id] : []),
          ]
          expect(getAvatarLayerIds(state)).toEqual(expected)
          expect(expected.every(id => (AVATAR_PIXEL_LAYERS[id]?.length ?? 0) > 0)).toBe(true)
          combinations += 1
        }
      }
    }

    expect(combinations).toBe(3456)
  })

  it('keeps every pixel rectangle on the 96 by 144 integer grid', () => {
    const requiredLayerIds = new Set(AVATAR_PARTS.flatMap(part => part.layerIds ?? [part.id]))
    for (const id of requiredLayerIds) {
      const rects = AVATAR_PIXEL_LAYERS[id]
      expect(rects?.length, id).toBeGreaterThan(0)
    }
    for (const [id, pixels] of Object.entries(AVATAR_PIXEL_LAYERS)) for (const pixel of pixels) {
      expect([pixel.x, pixel.y, pixel.width, pixel.height].every(Number.isInteger), id).toBe(true)
      expect(pixel.x, id).toBeGreaterThanOrEqual(0)
      expect(pixel.y, id).toBeGreaterThanOrEqual(0)
      expect(pixel.width, id).toBeGreaterThan(0)
      expect(pixel.height, id).toBeGreaterThan(0)
      expect(pixel.x + pixel.width, id).toBeLessThanOrEqual(96)
      expect(pixel.y + pixel.height, id).toBeLessThanOrEqual(144)
    }
  })

  it('uses complete four-step local palettes for every cosmetic family', () => {
    const fillsFor = (...ids:string[]) => new Set(ids.flatMap(id => AVATAR_PIXEL_LAYERS[id].map(pixel => pixel.fill)))
    const expectFills = (fills:Set<string>, expected:string[]) => {
      for (const fill of expected) expect(fills, fill).toContain(fill)
    }

    for (const base of ['base-male', 'base-female']) {
      expectFills(fillsFor(base), ['skinLight', 'skin', 'skinShade', 'skinDeep'])
    }
    for (const hair of ['short', 'bob', 'wave', 'tied']) {
      expectFills(fillsFor(`hair-${hair}-back`, `hair-${hair}-front`), ['hairLight', 'hair', 'hairShade', 'hairDeep'])
    }
    for (const layer of ['top-runner', 'top-gym', 'top-walk', 'bottom-pants', 'bottom-shorts', 'hat-wellness-cap', 'accessory-bottle-pouch']) {
      expectFills(fillsFor(layer), ['fabricLight', 'fabric', 'fabricShade', 'fabricDeep'])
    }
    for (const layer of ['shoes-trainers', 'shoes-walk']) {
      expectFills(fillsFor(layer), ['shoeLight', 'shoe', 'shoeShade', 'outline'])
    }
  })

  it('anchors eye and mouth pixels to the approved face bands', () => {
    for (const base of ['base-male', 'base-female']) {
      for (const pixel of AVATAR_PIXEL_LAYERS[`${base}-eyes`]) {
        expect(pixel.y, `${base} eye`).toBeGreaterThanOrEqual(34)
        expect(pixel.y + pixel.height, `${base} eye`).toBeLessThanOrEqual(40)
      }
      for (const pixel of AVATAR_PIXEL_LAYERS[`${base}-mouth`]) {
        expect(pixel.y, `${base} mouth`).toBeGreaterThanOrEqual(48)
        expect(pixel.y + pixel.height, `${base} mouth`).toBeLessThanOrEqual(52)
      }
    }
  })
})
