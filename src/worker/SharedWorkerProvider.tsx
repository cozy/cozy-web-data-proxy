import * as Comlink from 'comlink';
import React, { useState, useEffect, ReactNode } from 'react';

import { useClient } from 'cozy-client';

import { DataProxyWorker } from 'src/common/DataProxyInterface';

export const SharedWorkerContext = React.createContext<DataProxyWorker | undefined>(undefined)

interface SharedWorkerProviderProps {
    children: ReactNode
}

export const SharedWorkerProvider = React.memo(({ children }: SharedWorkerProviderProps) => {
  const [worker, setWorker] = useState<DataProxyWorker | undefined>()
  const client = useClient()

  useEffect(() => {
    if (!client) return

    const doAsync = async () => {
      const workerInst = new SharedWorker(new URL('./shared-worker.ts', import.meta.url), {
        name: 'dataproxy-worker',
      });

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

  return (
    <SharedWorkerContext.Provider value={worker}>
      {children}
    </SharedWorkerContext.Provider>
  )
})

SharedWorkerProvider.displayName = 'SharedWorkerProvider'
