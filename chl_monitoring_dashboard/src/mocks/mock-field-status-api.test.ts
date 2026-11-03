import { describe, expect, it } from 'vitest'
import { fieldStatusSchema } from '@/features/field-status/field-status.schemas'
import { presetPeriod } from '@/features/overview/overview-period'
import { summarizeFieldStatus } from './mock-field-status-api'
import { summarizeVerifications } from './mock-verifications-api'

const NOW = Date.parse('2026-10-18T12:00:00+01:00')
const TODAY = '2026-10-18'
const filters = (scope: string, agentId: string | null = null) => ({
  scope,
  range: '30d' as const,
  ...presetPeriod('30d', TODAY),
  agentId,
  organization: null,
})

describe('summarizeFieldStatus', () => {
  it('returns data the schema accepts, one report per agent, latest first', () => {
    const result = summarizeFieldStatus(filters('ng'), NOW)
    expect(fieldStatusSchema.safeParse(result).success).toBe(true)
    const agents = result.devices.map((device) => device.agent.id)
    expect(agents.length).toBeGreaterThan(0)
    expect(new Set(agents).size).toBe(agents.length)
    const times = result.devices.map((device) => Date.parse(device.reportedAt))
    expect(times).toEqual([...times].sort((a, b) => b - a))
  })

  it('reports each agent’s status with their latest record, offline when it was sent later', () => {
    const { records } = summarizeVerifications(filters('ng'), NOW)
    for (const device of summarizeFieldStatus(filters('ng'), NOW).devices) {
      const latest = records.find((record) => record.agent.id === device.agent.id)!
      expect(device.reportedAt).toBe(latest.recordedAt)
      expect(device.internet).toBe(latest.source === 'offline' ? 'disconnected' : 'connected')
    }
  })

  it('leaves out agents who reported nothing, and a status CHL does not supply', () => {
    const { devices } = summarizeFieldStatus(filters('ng'), NOW)
    expect(devices.some((device) => device.agent.id === 'JRB-AG-0146')).toBe(false)
    expect(devices.find((device) => device.agent.id === 'JRB-AG-0144')?.rfidReader).toBeNull()
  })

  it('narrows to one agent', () => {
    const { devices } = summarizeFieldStatus(filters('ng', 'JRB-AG-0142'), NOW)
    expect(devices.map((device) => device.agent.id)).toEqual(['JRB-AG-0142'])
  })
})
