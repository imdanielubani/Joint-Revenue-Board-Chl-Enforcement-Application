/**
 * The address of a file in `public/assets/`. Those files are served as they
 * are, so they are referenced by URL rather than imported; this keeps the
 * URL right if the dashboard is served from a sub-path.
 */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}assets/${path.replace(/^\/+/, '')}`
}
