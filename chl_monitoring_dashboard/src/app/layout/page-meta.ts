import { paths } from '@/config/paths'
import { MODULES } from '../modules'

/** What the top bar shows for the current page. */
export interface PageMeta {
  title: string
  crumbs: readonly string[]
  /** The icon in the top bar's tile, in public/assets/. */
  tileIcon: string
}

const OTHER_PAGES: Record<string, PageMeta> = {
  [paths.profile]: {
    title: 'Profile',
    crumbs: ['Workspace', 'Account'],
    tileIcon: 'shell/menu-profile.svg',
  },
  [paths.settings]: {
    title: 'Settings',
    crumbs: ['Workspace', 'Account'],
    tileIcon: 'shell/menu-settings.svg',
  },
  [paths.search]: {
    title: 'Search results',
    crumbs: ['Workspace', 'Search'],
    tileIcon: 'shell/search.svg',
  },
}

const NOT_FOUND: PageMeta = {
  title: 'Page not found',
  crumbs: ['Workspace'],
  tileIcon: 'shell/tile-overview.svg',
}

/**
 * The top bar's title, breadcrumb and icon for a path. A module's page for one
 * record has the module in its breadcrumb and its own title.
 */
export function pageMeta(pathname: string): PageMeta {
  const module = MODULES.find(
    (candidate) => pathname === candidate.path || pathname.startsWith(`${candidate.path}/`),
  )
  if (module) {
    const crumbs = module.crumbs ?? [module.section, module.label]
    const tileIcon = module.tileIcon ?? module.icon
    if (pathname !== module.path && module.recordTitle) {
      return { title: module.recordTitle, crumbs: [module.section, module.label], tileIcon }
    }
    return { title: module.title ?? module.label, crumbs, tileIcon }
  }
  return OTHER_PAGES[pathname] ?? NOT_FOUND
}
