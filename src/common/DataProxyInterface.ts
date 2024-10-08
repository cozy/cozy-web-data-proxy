import { ClientCapabilities } from 'cozy-client/types/types'

export interface DataProxyWorker {
  search: (query: string) => Promise<unknown>
  setClient: (clientData: ClientData) => Promise<void>
}

export interface ClientData {
  uri: string
  token: string,
  instanceOptions: ClientInstanceOptions,
  capabilities: ClientCapabilities
}

interface ClientInstanceOptions {
  subdomain: 'flat' | 'nested'
}
