import { ConnectionDefinition } from '../types'
import { fkOutgoingDefinition } from './fk-outgoing'
import { fkIncomingDefinition } from './fk-incoming'
import { triggersDefinition } from './triggers'
import { hooksDefinition } from './hooks'
import { policiesDefinition } from './policies'
import { realtimeDefinition } from './realtime'

export const connectionDefinitions: ConnectionDefinition[] = [
  fkOutgoingDefinition,
  fkIncomingDefinition,
  triggersDefinition,
  hooksDefinition,
  policiesDefinition,
  realtimeDefinition,
]
