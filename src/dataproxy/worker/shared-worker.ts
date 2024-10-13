import * as Comlink from 'comlink'

import CozyClient from 'cozy-client'
import Minilog from 'cozy-minilog'

import {
  ClientData,
  DataProxyWorker,
  DataProxyWorkerPartialState,
  SearchIndex
} from '@/dataproxy/common/DataProxyInterface'
import schema from '@/doctypes'
import { initIndexes } from '@/search/initIndexes'
import { search } from '@/search/search'

const log = Minilog('👷‍♂️ [shared-worker]')
Minilog.enable()

let client: CozyClient | undefined = undefined
let searchIndexes: SearchIndex[] | undefined = undefined

const boardcastChannel = new BroadcastChannel('DATA_PROXY_BROADCAST_CHANANEL')

const dataProxy: DataProxyWorker = {
  setClient: async (clientData: ClientData) => {
    log.debug('Received data for setting client')
    if (client) return
    updateState()
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
      updateState()
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

const updateState = (): void => {
  const state = {} as DataProxyWorkerPartialState

  if (client && searchIndexes) {
    state.status = 'Ready'
    state.indexLength = searchIndexes.map(searchIndex => ({
      doctype: searchIndex.doctype,
      // @ts-expect-error index.store is not TS typed
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      count: Object.keys(searchIndex.index.store).length
    }))
    boardcastChannel.postMessage(state)
    return
  }

  if (client) {
    state.status = 'Client set'
    boardcastChannel.postMessage(state)
    return
  }

  state.status = 'Waiting configuration'
  boardcastChannel.postMessage(state)
}

onconnect = (e: MessageEvent): void => {
  const port = e.ports[0]

  Comlink.expose(dataProxy, port)
  updateState()
}
