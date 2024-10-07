import { IOCozyFile, FileDocument, FolderDocument, IOCozyContact, IOCozyApp } from 'cozy-client/types/types'


export interface DataProxyWorker {
  search: (query: string) => Promise<unknown>
  setClient: (clientData: ClientData) => Promise<void>
}

export interface ClientData {
  uri: string
  token: string
}

interface DBRow {
  id: string
  doc: IOCozyFile
}

export interface AllDocsResponse {
  rows: DBRow[]
}


export type CozyDocs = CozyDoc[]

export type CozyDoc = (IOCozyFile | IOCozyContact | IOCozyApp)