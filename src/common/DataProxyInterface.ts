import { ClientCapabilities } from 'cozy-client/types/types'

export interface DataProxyWorker {
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
