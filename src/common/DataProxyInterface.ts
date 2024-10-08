import { ClientCapabilities, IOCozyApp, IOCozyContact, IOCozyFile } from 'cozy-client/types/types'

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

export interface ClientInstanceOptions {
  subdomain: 'flat' | 'nested'
  locale: string
}

export interface SearchResult {
  doc: IOCozyFile | IOCozyApp | IOCozyContact
  type: string
  title: string
  name: string
  url: string
}
