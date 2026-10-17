import { z } from 'zod'
import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockAreasApi } from '@/mocks/mock-areas-api'
import { areaSchema, type Area } from './areas'

export interface AreasApi {
  /** CHL's geographical configuration, as far as the user may see it. */
  getAreas(): Promise<Area[]>
}

// The path is provisional until the backend's API is agreed.
const httpAreasApi: AreasApi = {
  getAreas: () => request('/api/v1/areas', z.array(areaSchema)),
}

export const areasApi: AreasApi = env.useMocks ? mockAreasApi : httpAreasApi
