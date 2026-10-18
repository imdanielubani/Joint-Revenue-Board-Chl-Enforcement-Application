import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

describe('parseEnv', () => {
  it('defaults to development on sample data', () => {
    expect(parseEnv({})).toEqual({
      appEnv: 'development',
      apiBaseUrl: '',
      useMocks: true,
      mapTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      mapAttribution: expect.stringContaining('OpenStreetMap'),
    })
  })

  it('takes a map tile address, or none to turn the map off', () => {
    expect(
      parseEnv({ VITE_MAP_TILE_URL: 'https://tiles.example/{z}/{x}/{y}.png' }).mapTileUrl,
    ).toBe('https://tiles.example/{z}/{x}/{y}.png')
    expect(parseEnv({ VITE_MAP_TILE_URL: '' }).mapTileUrl).toBe('')
    expect(() => parseEnv({ VITE_MAP_TILE_URL: 'http://tiles.example/{z}/{x}/{y}.png' })).toThrow(
      /VITE_MAP_TILE_URL/,
    )
    expect(() => parseEnv({ VITE_MAP_TILE_URL: 'https://tiles.example/map.png' })).toThrow(
      /VITE_MAP_TILE_URL/,
    )
  })

  it('drops a trailing slash from the backend address', () => {
    const env = parseEnv({ VITE_USE_MOCKS: 'false', VITE_API_BASE_URL: 'http://localhost:3000/' })
    expect(env.apiBaseUrl).toBe('http://localhost:3000')
  })

  it('refuses sample data in production', () => {
    expect(() => parseEnv({ VITE_APP_ENV: 'production' })).toThrow(/sample data/)
  })

  it('needs a backend address when sample data is off', () => {
    expect(() => parseEnv({ VITE_USE_MOCKS: 'false' })).toThrow(/VITE_API_BASE_URL/)
  })

  it('needs https outside development', () => {
    expect(() =>
      parseEnv({
        VITE_APP_ENV: 'staging',
        VITE_USE_MOCKS: 'false',
        VITE_API_BASE_URL: 'http://staging.example',
      }),
    ).toThrow(/https/)
  })
})
