import * as Comlink from 'comlink'

import CozyClient, { StackLink } from 'cozy-client'
import { SearchEngine } from 'cozy-dataproxy-lib/api'
import Minilog from 'cozy-minilog'
import PouchLink from 'cozy-pouch-link'

import {
  FILES_DOCTYPE,
  CONTACTS_DOCTYPE,
  APPS_DOCTYPE,
  REPLICATION_DEBOUNCE,
  REPLICATION_DEBOUNCE_MAX_DELAY
} from '@/consts'
import {
  ClientData,
  DataProxyWorker,
  DataProxyWorkerPartialState,
  SearchOptions
} from '@/dataproxy/common/DataProxyInterface'
import { queryIsTrustedDevice } from '@/dataproxy/worker/data'
import { platformWorker } from '@/dataproxy/worker/platformWorker'
import schema from '@/doctypes'
import { getPouchLink } from '@/helpers/client'

const log = Minilog('👷‍♂️ [shared-worker]')
Minilog.enable()

let client: CozyClient | undefined = undefined
let searchEngine: SearchEngine

const broadcastChannel = new BroadcastChannel('DATA_PROXY_BROADCAST_CHANANEL')

const dataProxy: DataProxyWorker = {
  setup: async (clientData: ClientData) => {
    log.debug('Received data for setting up client')
    if (client) return
    updateState()

    const pouchLinkOptions = {
      doctypes: [FILES_DOCTYPE, CONTACTS_DOCTYPE, APPS_DOCTYPE],
      initialSync: true,
      periodicSync: false,
      syncDebounceDelayInMs: REPLICATION_DEBOUNCE,
      syncDebounceMaxDelayInMs: REPLICATION_DEBOUNCE_MAX_DELAY,
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
      store: true
    })

    // If the device is not trusted, we do not want to store any private data in Pouch
    // So use the PouchLink only if the user declared a trustful device for the given session
    const isTrustedDevice = await queryIsTrustedDevice(client)
    const link = isTrustedDevice
      ? new PouchLink(pouchLinkOptions)
      : new StackLink()

    await client.setLinks([link])
    client.instanceOptions = clientData.instanceOptions
    client.capabilities = clientData.capabilities

    searchEngine = new SearchEngine(client)

    log.debug('Setup done')
    updateState()
  },

  search: (query: string, options: SearchOptions | undefined) => {
    if (!client) {
      throw new Error(
        'Client is required to execute a search, please initialize CozyClient'
      )
    }
    if (!searchEngine) {
      throw new Error('SearchEngine is not initialized')
    }
    const startSearchTime = performance.now()
    const results = searchEngine.search(query, options)
    const endSearchTime = performance.now()
    log.debug(`Search took ${endSearchTime - startSearchTime} ms`)
    return results
  },

  forceSyncPouch: () => {
    if (!client) {
      throw new Error(
        'Client is required to execute a forceSyncPouch, please initialize CozyClient'
      )
    }
    const pouchLink = getPouchLink(client)
    if (pouchLink) {
      pouchLink.startReplication()
    }
  }
}

const updateState = (): void => {
  const state = {} as DataProxyWorkerPartialState

  if (client && searchEngine && searchEngine.searchIndexes) {
    state.status = 'Ready'
    state.indexLength = Object.entries(searchEngine.searchIndexes).map(
      ([doctype, searchIndex]) => ({
        doctype,
        // @ts-expect-error index.store is not TS typed
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        count: Object.keys(searchIndex.index.store).length
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
