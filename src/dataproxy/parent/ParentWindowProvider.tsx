import * as Comlink from 'comlink'
import React, { ReactNode } from 'react'

import { QueryDefinition } from 'cozy-client'
import {
  Mutation,
  MutationOptions,
  QueryOptions
} from 'cozy-client/types/types'

import {
  DataProxyWorkerContext,
  SearchOptions
} from '@/dataproxy/common/DataProxyInterface'
import { useSharedWorker } from '@/dataproxy/worker/useSharedWorker'

export const ParentWindowContext = React.createContext<
  DataProxyWorkerContext | undefined
>(undefined)

interface ParentWindowProviderProps {
  children: ReactNode
}

const sendReadyMessage = (): void => {
  // This is useful to inform the parent apps that the DataProxy's iframe is ready to be requested
  window.parent.postMessage({ type: 'DATAPROXYMESSAGE', payload: 'READY' }, '*')
}

export const ParentWindowProvider = React.memo(
  ({ children }: ParentWindowProviderProps) => {
    const workerContext = useSharedWorker()

    const iframeProxy = {
      search: async (
        search: string,
        options: SearchOptions
      ): Promise<unknown> => {
        const result = await workerContext.worker.search(search, options)

        return result
      },
      requestLink: async (
        operation: QueryDefinition | Mutation,
        options?: QueryOptions | MutationOptions | undefined
      ): Promise<unknown> => {
        return workerContext.worker.requestLink(operation, options)
      }
    }

    Comlink.expose(iframeProxy, Comlink.windowEndpoint(parent))
    sendReadyMessage()

    if (!workerContext) return undefined

    return (
      <ParentWindowContext.Provider value={workerContext}>
        {children}
      </ParentWindowContext.Provider>
    )
  }
)
ParentWindowProvider.displayName = 'SharedWorkerProvider'
