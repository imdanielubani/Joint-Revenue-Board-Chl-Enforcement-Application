import type { AreasApi } from '@/features/geography/areas.api'
import type { Area } from '@/features/geography/areas'
import { delay } from './delay'

const area = (id: string, name: string, level: Area['level'], parentId: string | null): Area => ({
  id,
  name,
  level,
  parentId,
})

/**
 * Sample geography: Nigeria, four regions, a subregion, and the states, LGAs,
 * ward, zone and enforcement points the sample records come from. The ids of Nigeria, Lagos
 * and Ikeja match the sample accounts' assigned areas.
 */
export const MOCK_AREAS: Area[] = [
  area('ng', 'Nigeria', 'national', null),

  area('sw', 'South West', 'region', 'ng'),
  area('sw-lagos-metro', 'Lagos Metropolitan', 'subregion', 'sw'),
  area('la', 'Lagos', 'state', 'sw-lagos-metro'),
  area('la-ikeja', 'Ikeja', 'lga', 'la'),
  area('la-ikeja-ojota', 'Ojota', 'ward', 'la-ikeja'),
  area('la-zone-1', 'Lagos Zone 1', 'zone', 'la-ikeja-ojota'),
  area('loc_ojota', 'Ojota enforcement point', 'enforcement_point', 'la-zone-1'),
  area('loc_ikeja_gate', 'Ikeja Gate 3', 'enforcement_point', 'la-ikeja'),
  area('la-apapa', 'Apapa', 'lga', 'la'),
  area('loc_apapa', 'Apapa Port Rd', 'enforcement_point', 'la-apapa'),

  area('nw', 'North West', 'region', 'ng'),
  area('kn', 'Kano', 'state', 'nw'),
  area('kn-municipal', 'Kano Municipal', 'lga', 'kn'),
  area('loc_kano_zaria', 'Kano-Zaria Exp', 'enforcement_point', 'kn-municipal'),

  area('nc', 'North Central', 'region', 'ng'),
  area('fct', 'FCT', 'state', 'nc'),
  area('fct-amac', 'AMAC', 'lga', 'fct'),
  area('loc_zuba', 'Zuba Junction', 'enforcement_point', 'fct-amac'),
  area('pl', 'Plateau', 'state', 'nc'),
  area('pl-jos-north', 'Jos North', 'lga', 'pl'),

  area('ss', 'South South', 'region', 'ng'),
  area('rv', 'Rivers', 'state', 'ss'),
  area('rv-eleme', 'Eleme', 'lga', 'rv'),
  area('loc_eleme', 'Eleme Toll', 'enforcement_point', 'rv-eleme'),
]

export const mockAreasApi: AreasApi = {
  async getAreas() {
    await delay()
    return MOCK_AREAS
  },
}
