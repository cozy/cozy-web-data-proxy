import * as Comlink from 'comlink'

import CozyClient from 'cozy-client'

import {
  ClientData,
  DataProxyWorker
} from '@/dataproxy/common/DataProxyInterface'
import schema from '@/doctypes'

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
      store: true
    })
  }
}

onconnect = (e: MessageEvent): void => {
  const port = e.ports[0]

  Comlink.expose(dataProxy, port)
}
