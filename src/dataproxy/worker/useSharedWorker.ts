import { useContext } from 'react'

import { DataProxyWorkerContext } from '@/dataproxy/common/DataProxyInterface'
import { SharedWorkerContext } from '@/dataproxy/worker/SharedWorkerProvider'

export const useSharedWorker = (): DataProxyWorkerContext => {
  const context = useContext(SharedWorkerContext)

  if (!context) {
    throw new Error('Please embed')
  }

  return context
}
