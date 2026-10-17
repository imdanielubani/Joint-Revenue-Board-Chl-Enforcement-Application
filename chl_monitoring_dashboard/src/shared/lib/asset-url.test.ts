import { describe, expect, it } from 'vitest'
import { assetUrl } from './asset-url'

describe('assetUrl', () => {
  it('points into public/assets from the site root', () => {
    expect(assetUrl('brand/jrb-logo.png')).toBe('/assets/brand/jrb-logo.png')
    expect(assetUrl('/auth/map-dots.png')).toBe('/assets/auth/map-dots.png')
  })
})
