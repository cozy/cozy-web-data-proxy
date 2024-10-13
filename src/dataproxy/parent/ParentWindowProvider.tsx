import * as Comlink from 'comlink'
import React, { ReactNode } from 'react'

import { DataProxyWorkerContext } from '@/dataproxy/common/DataProxyInterface'
import { useSharedWorker } from '@/dataproxy/worker/useSharedWorker'

export const ParentWindowContext = React.createContext<
  DataProxyWorkerContext | undefined
>(undefined)

interface ParentWindowProviderProps {
  children: ReactNode
}

export const ParentWindowProvider = React.memo(
  ({ children }: ParentWindowProviderProps) => {
    const workerContext = useSharedWorker()

    const iframeProxy = {
      search: async (search: string): Promise<unknown> => {
        const result = await workerContext.worker.search(search)

        return result
      }
    }

    Comlink.expose(iframeProxy, Comlink.windowEndpoint(parent))

    if (!workerContext) return undefined

    return (
      <ParentWindowContext.Provider value={workerContext}>
        {children}
      </ParentWindowContext.Provider>
    )
  }
)
ParentWindowProvider.displayName = 'SharedWorkerProvider'
