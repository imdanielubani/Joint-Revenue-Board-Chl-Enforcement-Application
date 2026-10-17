import { z } from 'zod'
import { GEO_LEVELS, type GeoLevel, type GeoScope } from '@/features/auth/auth.schemas'

/**
 * One area of CHL's geographical configuration. Areas form a tree (national,
 * region, subregion, state, LGA, ward, zone, enforcement point); the parent of
 * each comes from CHL and is never assumed here (SRD section 4).
 */
export const areaSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.enum(GEO_LEVELS),
  /** Null for the top of the tree. */
  parentId: z.string().nullable(),
})
export type Area = z.infer<typeof areaSchema>

/** The word after an area's name: "Lagos state", "Ikeja LGA". */
const LEVEL_WORDS: Record<GeoLevel, string> = {
  national: '',
  region: 'region',
  subregion: 'subregion',
  state: 'state',
  lga: 'LGA',
  ward: 'ward',
  zone: 'zone',
  enforcement_point: '',
}

/** "Lagos state", "Ikeja LGA", "Ojota enforcement point"; "National" for the whole country. */
export function areaTitle(area: Pick<Area, 'name' | 'level'>): string {
  if (area.level === 'national') return 'National'
  const word = LEVEL_WORDS[area.level]
  // "Lagos Zone 1" already says what it is.
  if (!word || area.name.toLowerCase().includes(word.toLowerCase())) return area.name
  return `${area.name} ${word}`
}

/** The level as a caption: "State", "Enforcement point". */
export function levelCaption(level: GeoLevel): string {
  const caption = {
    national: 'National',
    region: 'Region',
    subregion: 'Subregion',
    state: 'State',
    lga: 'LGA',
    ward: 'Ward',
    zone: 'Enforcement zone',
    enforcement_point: 'Enforcement point',
  } satisfies Record<GeoLevel, string>
  return caption[level]
}

export interface PlacedArea {
  area: Area
  /** 0 for the user's own areas, 1 for their children, and so on. */
  depth: number
}

/**
 * The areas a user may report on: each of their assigned areas and everything
 * under it, in tree order. An assigned area CHL does not list is kept, so the
 * user never loses access because the configuration is incomplete.
 */
export function areasWithin(scopes: readonly GeoScope[], areas: readonly Area[]): PlacedArea[] {
  const children = new Map<string, Area[]>()
  for (const area of areas) {
    if (area.parentId === null) continue
    const siblings = children.get(area.parentId) ?? []
    siblings.push(area)
    children.set(area.parentId, siblings)
  }
  const byId = new Map(areas.map((area) => [area.id, area]))

  const placed: PlacedArea[] = []
  const seen = new Set<string>()
  const visit = (area: Area, depth: number) => {
    if (seen.has(area.id)) return
    seen.add(area.id)
    placed.push({ area, depth })
    for (const child of children.get(area.id) ?? []) visit(child, depth + 1)
  }
  for (const scope of scopes) {
    visit(byId.get(scope.id) ?? { ...scope, parentId: null }, 0)
  }
  return placed
}
