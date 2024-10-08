import FlexSearch from 'flexsearch'
import * as Comlink from 'comlink'

import CozyClient from 'cozy-client'

import { ClientData, DataProxyWorker } from 'src/common/DataProxyInterface'
import schema from 'src/doctypes'
import { initIndexes, searchOnIndexes } from 'src/worker/search'
import { CozyDoc } from 'src/worker/search/types'

let client: CozyClient | undefined = undefined
let searchIndexes: FlexSearch.Document<CozyDoc, true>[] | undefined = undefined

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
    if (!searchIndexes) {
      const indexes = await initIndexes(client)
      searchIndexes = indexes
    }
  },
  search: async (query: string) => {
    if (!client) {
      throw new Error('Client is required to execute a seach, please initialize CozyClient')
    }

    if (!searchIndexes) {
      return []
    }

    console.log('[SEARCH] indexes : ', searchIndexes)

    const results = searchOnIndexes(query, searchIndexes)
    console.log('[SEARCH] results : ', JSON.stringify(results, null, 2));
    return results.flatMap(res => {
      return res.result.map(res2 => {
        return {...res2.doc, type: 'file', title: res2.doc.name, name: res2.doc.path }
      }) 
    })
  }
}

onconnect = e => {
  const port = e.ports[0]

  Comlink.expose(dataProxy, port)
}
