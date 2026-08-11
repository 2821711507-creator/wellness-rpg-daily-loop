import type { CSSProperties } from 'react'
import { AVATAR_PARTS } from '../data/avatarManifest'
import { AVATAR_PIXEL_LAYERS, type PixelFill } from '../data/avatarPixelLayers'
import { getAvatarLayerIds, type AvatarState } from '../domain/avatar'

const SKIN_NAMES = { light:'밝은 피부', medium:'중간 피부', deep:'짙은 피부' } as const
const SKIN_PALETTES = {
  light:['#f2c7a5', '#d99c79'], medium:['#c98d69', '#a9684b'], deep:['#815237', '#633b28'],
} as const
const FILL:Record<PixelFill,string> = {
  skin:'var(--avatar-skin)', skinShade:'var(--avatar-skin-shade)', hair:'var(--avatar-hair)', hairShade:'var(--avatar-hair-shade)',
  fabric:'var(--avatar-fabric)', fabricShade:'var(--avatar-fabric-shade)', shoe:'var(--avatar-shoe)', ink:'var(--ink)', white:'var(--surface)',
}

function partName(state:AvatarState, slot:'hair'|'top'|'bottom'|'shoes') {
  return AVATAR_PARTS.find(part => part.id === state.equipped[slot])?.name ?? ''
}

export function AvatarRenderer({ state, className = '' }: { state:AvatarState; className?:string }) {
  const [skin, skinShade] = SKIN_PALETTES[state.skin]
  const top = state.equipped.top
  const fabric = top === 'top-walk' ? '#8fb6ad' : top === 'top-gym' ? '#7185a0' : '#5b9bd5'
  const fabricShade = top === 'top-walk' ? '#668f87' : top === 'top-gym' ? '#50647f' : '#367fbf'
  const style = { '--avatar-skin':skin, '--avatar-skin-shade':skinShade, '--avatar-hair':'#33405a', '--avatar-hair-shade':'#202a3c', '--avatar-fabric':fabric, '--avatar-fabric-shade':fabricShade, '--avatar-shoe':'#475a76' } as CSSProperties
  const genderName = state.gender === 'male' ? '남성 캐릭터' : '여성 캐릭터'
  const name = [genderName, SKIN_NAMES[state.skin], partName(state, 'hair'), partName(state, 'top'), partName(state, 'bottom'), partName(state, 'shoes')].filter(Boolean).join(', ')
  return <svg className={`avatar-renderer ${className}`.trim()} viewBox="0 0 32 48" role="img" aria-label={name} shapeRendering="crispEdges" style={style}>
    {getAvatarLayerIds(state).map(id => <g key={id} data-layer-id={id}>{AVATAR_PIXEL_LAYERS[id]?.map((pixel, index) => <rect key={index} x={pixel.x} y={pixel.y} width={pixel.width} height={pixel.height} fill={FILL[pixel.fill]}/>)}</g>)}
  </svg>
}
