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
import { removeStaleLocalData } from '@/dataproxy/worker/data'

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
        // Cleanup any remaining local data
        await removeStaleLocalData()

        log.debug('Init SharedWorker')

        let obj: Comlink.Remote<DataProxyWorker>
        let useRemoteData: boolean = false
        try {
          const workerInst = new SharedWorker(
            new URL('./worker.ts', import.meta.url),
            {
              name: 'dataproxy-worker'
            }
          )
          obj = Comlink.wrap<DataProxyWorker>(workerInst.port)
        } catch (e) {
          // SharedWorker is not available in all contexts, e.g. old desktop browsers
          // or some mobile browsers. So we fallback to web worker and ask the dataproxy
          // to use remote data rather than local.
          log.warn('SharedWorker is not available. Falling back to web Worker')
          const workerInst = new Worker(
            new URL('./worker.ts', import.meta.url),
            {
              name: 'dataproxy-worker'
            }
          )
          obj = Comlink.wrap<DataProxyWorker>(workerInst)
          useRemoteData = true
        }

        log.debug('Provide CozyClient data to Worker')
        const { uri, token } = client.getStackClient()

        await obj.setup({
          uri,
          token: token.token,
          instanceOptions: client.instanceOptions,
          capabilities: client.capabilities,
          useRemoteData
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
