import * as Comlink from 'comlink'

import CozyClient from 'cozy-client'
import Minilog from 'cozy-minilog'

import {
  ClientData,
  DataProxyWorker,
  SearchIndex
} from '@/dataproxy/common/DataProxyInterface'
import schema from '@/doctypes'
import { initIndexes } from '@/search/initIndexes'
import { search } from '@/search/search'

const log = Minilog('👷‍♂️ [shared-worker]')
Minilog.enable()

let client: CozyClient | undefined = undefined
let searchIndexes: SearchIndex[] | undefined = undefined

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
    client.instanceOptions = clientData.instanceOptions
    client.capabilities = clientData.capabilities
    if (!searchIndexes) {
      const indexes = await initIndexes(client)
      searchIndexes = indexes
    }
  },
  search: async (query: string) => {
    log.debug('Received data for search')
    if (!client) {
      throw new Error(
        'Client is required to execute a seach, please initialize CozyClient'
      )
    }

    if (!searchIndexes) {
      return []
    }

    return search(query, searchIndexes, client)
  }
}

onconnect = (e: MessageEvent): void => {
  const port = e.ports[0]

  Comlink.expose(dataProxy, port)
}
