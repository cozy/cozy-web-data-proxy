import * as Comlink from 'comlink'

import CozyClient from 'cozy-client'
import Minilog from 'cozy-minilog'
import PouchLink from 'cozy-pouch-link'

import {
  ClientData,
  DataProxyWorker,
  DataProxyWorkerPartialState
} from '@/dataproxy/common/DataProxyInterface'
import { platformWorker } from '@/dataproxy/worker/platformWorker'
import schema from '@/doctypes'
import SearchEngine from '@/search/SearchEngine'
import { FILES_DOCTYPE, CONTACTS_DOCTYPE, APPS_DOCTYPE } from '@/search/consts'

const log = Minilog('👷‍♂️ [shared-worker]')
Minilog.enable()

let client: CozyClient | undefined = undefined
let searchEngine: SearchEngine

const broadcastChannel = new BroadcastChannel('DATA_PROXY_BROADCAST_CHANANEL')

const dataProxy: DataProxyWorker = {
  // FIXME: change setClient name
  setClient: async (clientData: ClientData) => {
    log.debug('Received data for setting client')
    if (client) return
    updateState()

    const pouchLinkOptions = {
      doctypes: [FILES_DOCTYPE, CONTACTS_DOCTYPE, APPS_DOCTYPE],
      initialSync: true,
      periodicSync: false,
      platform: { ...platformWorker },
      doctypesReplicationOptions: {
        [FILES_DOCTYPE]: {
          strategy: 'fromRemote'
        },
        [CONTACTS_DOCTYPE]: {
          strategy: 'fromRemote'
        },
        [APPS_DOCTYPE]: {
          strategy: 'fromRemote'
        }
      }
    }

    client = new CozyClient({
      uri: clientData.uri,
      token: clientData.token,
      appMetadata: {
        slug: 'cozy-data-proxy',
        version: '1'
      },
      schema,
      store: true,
      links: [new PouchLink(pouchLinkOptions)]
    })
    client.instanceOptions = clientData.instanceOptions
    client.capabilities = clientData.capabilities

    searchEngine = new SearchEngine(client)

    updateState()
  },

  search: async (query: string) => {
    if (!client) {
      throw new Error(
        'Client is required to execute a search, please initialize CozyClient'
      )
    }
    if (!searchEngine) {
      throw new Error('SearchEngine is not initialized')
    }

    return searchEngine.search(query)
  }
}

const updateState = (): void => {
  const state = {} as DataProxyWorkerPartialState

  if (client && searchEngine && searchEngine.searchIndexes) {
    state.status = 'Ready'
    state.indexLength = Object.keys(searchEngine.searchIndexes).map(
      (indexKey: string) => ({
        doctype: indexKey,
        // @ts-expect-error index.store is not TS typed
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        count: Object.keys(searchEngine.searchIndexes[indexKey].index.store)
          .length
      })
    )
    broadcastChannel.postMessage(state)
    return
  }

  if (client) {
    state.status = 'Client set'
    broadcastChannel.postMessage(state)
    return
  }

  state.status = 'Waiting configuration'
  broadcastChannel.postMessage(state)
}

onconnect = (e: MessageEvent): void => {
  const port = e.ports[0]

  Comlink.expose(dataProxy, port)
  updateState()
}
