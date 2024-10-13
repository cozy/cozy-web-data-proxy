import type { InstanceOptions } from 'cozy-client'
import type { ClientCapabilities } from 'cozy-client/types/types'

export type { SearchIndex } from '@/search/types'

export interface DataProxyWorker {
  search: (query: string) => Promise<unknown>
  setClient: (clientData: ClientData) => Promise<void>
}

export interface DataProxyWorkerContext {
  worker: DataProxyWorker
}

export interface ClientData {
  uri: string
  token: string
  instanceOptions: InstanceOptions
  capabilities: ClientCapabilities
}
