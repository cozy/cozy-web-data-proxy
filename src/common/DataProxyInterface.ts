import { ClientCapabilities, IOCozyApp, IOCozyContact, IOCozyFile } from 'cozy-client/types/types'
import { CozyDoc } from 'src/worker/search/types'
import FlexSearch from 'flexsearch'

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

export interface RawSearchResult {
  fields: string[]
  doc: CozyDoc
  doctype: string
}

export interface SearchIndex {
  index: FlexSearch.Document<CozyDoc, true>
  doctype: string
}