import * as Comlink from 'comlink'

import CozyClient from 'cozy-client'

import { ClientData, DataProxyWorker } from 'src/common/DataProxyInterface'
import schema from 'src/doctypes'

let client: CozyClient | undefined = undefined

const dataProxy: DataProxyWorker = {
  setClient: async (clientData: ClientData) => {
    client = new CozyClient({
      uri: clientData.uri,
      token: clientData.token,
      appMetadata: {
        slug: 'cozy-data-proxy',
        version: '1'
      },
      schema,
      store: true,
    })
    client.instanceOptions = clientData.instanceOptions as {}
    client.capabilities = clientData.capabilities
  },
  search: async (query: string) => {
    return 'Some Search Result'
  }
}

onconnect = e => {
  const port = e.ports[0]

  Comlink.expose(dataProxy, port)
}
