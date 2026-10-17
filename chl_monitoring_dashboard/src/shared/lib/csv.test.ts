import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('quotes values that need it', () => {
    expect(
      toCsv([
        ['Plate', 'Location'],
        ['KDN-512-ZA', 'Ojota, Lagos'],
        ['A "B"', 3],
      ]),
    ).toBe('Plate,Location\r\nKDN-512-ZA,"Ojota, Lagos"\r\n"A ""B""",3')
  })

  it('stops spreadsheets running a value as a formula', () => {
    expect(toCsv([['=1+1', '-5', '@x']])).toBe("'=1+1,'-5,'@x")
  })
})
