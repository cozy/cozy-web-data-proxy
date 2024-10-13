import * as Comlink from 'comlink'
import React, { useState, useEffect, ReactNode } from 'react'

import { useClient } from 'cozy-client'

import {
  DataProxyWorker,
  DataProxyWorkerContext
} from '@/dataproxy/common/DataProxyInterface'

export const SharedWorkerContext = React.createContext<
  DataProxyWorkerContext | undefined
>(undefined)

interface SharedWorkerProviderProps {
  children: ReactNode
}

export const SharedWorkerProvider = React.memo(
  ({ children }: SharedWorkerProviderProps) => {
    const [worker, setWorker] = useState<DataProxyWorker | undefined>()
    const client = useClient()

    useEffect(() => {
      if (!client) return

      const doAsync = async (): Promise<void> => {
        const workerInst = new SharedWorker(
          new URL('./shared-worker.ts', import.meta.url),
          {
            name: 'dataproxy-worker'
          }
        )

        const obj = Comlink.wrap<DataProxyWorker>(workerInst.port)

        const { uri, token } = client.getStackClient()

        await obj.setClient({
          uri,
          token: token.token,
          instanceOptions: client.instanceOptions,
          capabilities: client.capabilities
        })

        setWorker(() => obj)
      }

      doAsync()
    }, [client])

    if (!worker) return undefined

    const value = {
      worker
    }

    return (
      <SharedWorkerContext.Provider value={value}>
        {children}
      </SharedWorkerContext.Provider>
    )
  }
)

SharedWorkerProvider.displayName = 'SharedWorkerProvider'
