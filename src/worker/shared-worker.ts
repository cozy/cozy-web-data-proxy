import * as Comlink from 'comlink'

import CozyClient, { Q } from 'cozy-client'

import { ClientData, DataProxyWorker } from 'src/common/DataProxyInterface'
import schema from 'src/doctypes'

let client: CozyClient | undefined = undefined

const dataProxy: DataProxyWorker = {
  setClient: async (clientData: ClientData) => {
    console.log('RECEIVED setClient', clientData)
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
  },
  search: async (search: string) => {
    console.log('RECEIVED search', search)
    if (!client) {
      throw new Error('Set client first')
    }

    // return await client.query(Q('io.cozy.settings'))

    return [
      {
        type: 'file',
        title: 'Axa',
        name: '/Adminisitratif/' + search.length,
      },
      search.length % 2 === 0 ? {
        type: 'file',
        title: 'Axa',
        name: '/Adminisitratif/',
      } : undefined,
      {
        type: 'contact',
        title: 'Conseiller AXA',
        name: '0475361254',
      },
      search.length % 3 === 0 ? {
        type: 'contact',
        title: 'Conseiller AXA',
        name: '0475361254',
      } : {
        type: 'contact',
        title: 'Conseiller FORTUNEO',
        name: '0476989807',
      },
      search.length % 5 === 0 ? {
        type: 'file',
        title: 'Axa',
        name: '/Adminisitratif/',
      } : undefined,
      search.length % 5 === 0 ? {
        type: 'file',
        title: 'Axa',
        name: '/Adminisitratif/',
      } : undefined,
      search.length % 5 === 0 ? {
        type: 'contact',
        title: 'Conseiller AXA',
        name: '0475361254',
      } : undefined,
      {
        type: 'contact',
        title: 'Conseiller AXA',
        name: '0475361254',
      }
    ].filter(Boolean)
  }
}

onconnect = e => {
  const port = e.ports[0]

  Comlink.expose(dataProxy, port)
}
