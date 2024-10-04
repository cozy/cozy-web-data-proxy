export interface DataProxyWorker {
  search: (query: string) => Promise<unknown>
  setClient: (clientData: ClientData) => Promise<void>
}

export interface ClientData {
  uri: string
  token: string
}
