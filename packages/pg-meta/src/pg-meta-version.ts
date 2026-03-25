import { z } from 'zod'

import { VERSION_SQL } from './sql/version'

export const pgVersionZod = z.object({
  version: z.string(),
  version_number: z.number(),
  active_connections: z.number(),
  max_connections: z.number(),
})

function retrieve() {
  return {
    sql:
      `-- source: dashboard\n-- description: Retrieve a single PostgreSQL version by identifier\n` +
      VERSION_SQL,
    zod: pgVersionZod,
  }
}

export default {
  retrieve,
  zod: pgVersionZod,
}
