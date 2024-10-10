import FlexSearch from 'flexsearch'
import * as Comlink from 'comlink'

import CozyClient from 'cozy-client'
import PouchLink from 'cozy-pouch-link'
import Minilog from 'cozy-minilog'

import { ClientData, DataProxyWorker, SearchIndex } from 'src/common/DataProxyInterface'
import schema from 'src/doctypes'
import { deduplicateAndFlatten, initIndexes, searchOnIndexes, sortAndLimitSearchResults } from 'src/worker/search'
import { normalizeSearchResult } from 'src/worker/search/normalizeSearchResult'
import { APPS_DOCTYPE, CONTACTS_DOCTYPE, FILES_DOCTYPE } from 'src/consts'
import { platformWorker } from 'src/worker/data/platform'

const log = Minilog('👷‍♂️ [shared-worker]')
Minilog.enable()

let client: CozyClient | undefined = undefined
let searchIndexes: SearchIndex[] | undefined = undefined
let stateUpdatePointer = undefined

const dataProxy: DataProxyWorker = {
  setClient: async (clientData: ClientData) => {
    log.debug('Received data for setting client')
    if (client) return
    updateState()


    const pouchLinkOptions = {
      doctypes: [FILES_DOCTYPE, CONTACTS_DOCTYPE, APPS_DOCTYPE],
      initialSync: true,
      platform: {...platformWorker},
      doctypesReplicationOptions: {
        [FILES_DOCTYPE]: {
          strategy: 'fromRemote',
          initialReplication: true
        },
        [CONTACTS_DOCTYPE]: {
          strategy: 'fromRemote',
          initialReplication: true
        },
        [APPS_DOCTYPE]: {
          strategy: 'fromRemote',
          initialReplication: true
        }
      }
    }
    console.log('pouch options : ', pouchLinkOptions);
    
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
    client.instanceOptions = clientData.instanceOptions as {}
    client.capabilities = clientData.capabilities

    if (!searchIndexes) {
      updateState()
      const indexes = await initIndexes(client)
      updateState()
      searchIndexes = indexes
    }
  },
  search: async (query: string) => {
    log.debug('Received data for search')
    if (!client) {
      throw new Error('Client is required to execute a seach, please initialize CozyClient')
    }

    if (!searchIndexes) {
      return []
    }

    log.debug('[SEARCH] indexes : ', searchIndexes)

    // const results = searchOnIndexes(query, searchIndexes)
    // log.debug('[SEARCH] results : ', results)
    // return results.flatMap(res => {
    //   return res.result.map(res2 => {
    //     return {...res2.doc, type: 'file', title: res2.doc.name, name: res2.doc.path }
    //   }) 
    // })

    const allResults = searchOnIndexes(query, searchIndexes)
    console.log('[SEARCH] results : ', allResults);
    const results = deduplicateAndFlatten(allResults)
    console.log('[SEARCH] dedup : ', results);
    const sortedResults = sortAndLimitSearchResults(results)
    console.log('[SEARCH] sort : ', sortedResults);

    return sortedResults.map(res => normalizeSearchResult(client, res, query))
  },
  onStateUpdate: (callback) => {
    stateUpdatePointer = callback

    updateState()
  }
}

const updateState = () => {
  const state = {}

  if (client && searchIndexes) {
    state.status = 'Ready'
    stateUpdatePointer?.(state)
    return
  }

  if (client) {
    state.status = 'Client set'
    stateUpdatePointer?.(state)
    return
  }

  state.status = 'Waiting configuration'
  stateUpdatePointer?.(state)
}

onconnect = e => {
  const port = e.ports[0]

  Comlink.expose(dataProxy, port)
}
