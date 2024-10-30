import type { InstanceOptions } from 'cozy-client'
import type { ClientCapabilities } from 'cozy-client/types/types'

export type { SearchIndexes } from '@/search/types'

export interface DataProxyWorker {
  search: (query: string) => unknown
  setClient: (clientData: ClientData) => Promise<void>
}

export interface DataProxyWorkerPartialState {
  status: string
  tabCount: number
  indexLength?: IndexLength[]
}
export interface DataProxyWorkerState extends DataProxyWorkerPartialState {
  tabCount: number
}

export interface DataProxyWorkerContext {
  worker: DataProxyWorker
  workerState: DataProxyWorkerState
}

interface IndexLength {
  doctype: string
  count: number
}

export interface ClientData {
  uri: string
  token: string
  instanceOptions: InstanceOptions
  capabilities: ClientCapabilities
}
