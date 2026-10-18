import { env } from '@/config/env'
import { request } from '@/shared/api/http-client'
import { mockCommandCentreApi } from '@/mocks/mock-command-centre-api'
import {
  commandCentreSchema,
  type CommandCentre,
  type CommandCentreFilters,
} from './command-centre.schemas'

export interface CommandCentreApi {
  getCommandCentre(filters: CommandCentreFilters): Promise<CommandCentre>
}

// The path is provisional until the backend's API is agreed.
const httpCommandCentreApi: CommandCentreApi = {
  getCommandCentre: ({ scope, window }) =>
    request('/api/v1/command-centre', commandCentreSchema, { query: { scope, window } }),
}

export const commandCentreApi: CommandCentreApi = env.useMocks
  ? mockCommandCentreApi
  : httpCommandCentreApi
