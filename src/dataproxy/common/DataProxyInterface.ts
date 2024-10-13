export interface DataProxyWorker {
  setClient: (clientData: ClientData) => Promise<void>
}

export interface DataProxyWorkerContext {
  worker: DataProxyWorker
}

export interface ClientData {
  uri: string
  token: string
}
