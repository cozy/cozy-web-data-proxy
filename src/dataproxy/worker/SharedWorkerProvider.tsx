import * as Comlink from 'comlink'
import React, { useState, useEffect, ReactNode } from 'react'

import { useClient } from 'cozy-client'
import Minilog from 'cozy-minilog'

import {
  DataProxyWorker,
  DataProxyWorkerContext,
  DataProxyWorkerPartialState
} from '@/dataproxy/common/DataProxyInterface'
import { TabCountSync } from '@/dataproxy/common/TabCountSync'

const log = Minilog('👷‍♂️ [SharedWorkerProvider]')

export const SharedWorkerContext = React.createContext<
  DataProxyWorkerContext | undefined
>(undefined)

interface SharedWorkerProviderProps {
  children: ReactNode
}

let broadcastChannel: BroadcastChannel
if (typeof BroadcastChannel === 'function') {
  broadcastChannel = new BroadcastChannel('DATA_PROXY_BROADCAST_CHANANEL')
}
const tcs = new TabCountSync()
window.addEventListener('unload', () => tcs.close())

export const SharedWorkerProvider = React.memo(
  ({ children }: SharedWorkerProviderProps) => {
    const [worker, setWorker] = useState<DataProxyWorker | undefined>()
    const [workerState, setWorkerState] = useState<DataProxyWorkerPartialState>(
      {
        status: 'not initialized',
        tabCount: 0
      }
    )
    const [tabCount, setTabCount] = useState(0)
    const client = useClient()

    useEffect(() => {
      if (!client) return

      const doAsync = async (): Promise<void> => {
        log.debug('Init SharedWorker')
        const workerInst = new SharedWorker(
          new URL('./shared-worker.ts', import.meta.url),
          {
            name: 'dataproxy-worker'
          }
        )

        const obj = Comlink.wrap<DataProxyWorker>(workerInst.port)

        log.debug('Provide CozyClient data to SharedWorker')
        const { uri, token } = client.getStackClient()

        obj.setup({
          uri,
          token: token.token,
          instanceOptions: client.instanceOptions,
          capabilities: client.capabilities
        })
        setWorker(() => obj)
      }

      doAsync()
    }, [client])

    useEffect(() => {
      broadcastChannel.addEventListener('message', (event: MessageEvent) => {
        setWorkerState(event.data as DataProxyWorkerPartialState)
      })
    }, [])

    useEffect(() => {
      tcs.subscribe((count: number) => {
        setTabCount(count)
      })
    }, [])

    if (!worker) return undefined

    const value = {
      worker,
      workerState: {
        ...workerState,
        tabCount
      }
    }

    return (
      <SharedWorkerContext.Provider value={value}>
        {children}
      </SharedWorkerContext.Provider>
    )
  }
)

SharedWorkerProvider.displayName = 'SharedWorkerProvider'
