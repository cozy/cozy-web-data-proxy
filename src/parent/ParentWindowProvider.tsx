import * as Comlink from 'comlink'
import React, { ReactNode } from 'react'

import { DataProxyWorker } from 'src/common/DataProxyInterface'
import { useSharedWorker } from 'src/worker/useSharedWorker'

export const ParentWindowContext = React.createContext<DataProxyWorker | undefined>(undefined)

interface ParentWindowProviderProps {
    children: ReactNode
}

export const ParentWindowProvider = React.memo(({ children }: ParentWindowProviderProps) => {
  const worker = useSharedWorker()

  const iframeProxy = {
    search: async (search: string) => {
      console.log('RECEIVED SEARCH FROM PARENT')
      const result = await worker.search(search)
      console.log('INTERMEDIATE RESULT', result)
      return result
    }
  }

  Comlink.expose(iframeProxy, Comlink.windowEndpoint(parent));

  if (!worker) return undefined

  return (
    <ParentWindowContext.Provider value={worker}>
      {children}
    </ParentWindowContext.Provider>
  )
})
ParentWindowProvider.displayName = 'SharedWorkerProvider'
