import { useContext } from 'react'

import { SharedWorkerContext } from './SharedWorkerProvider'

export const useSharedWorker = () => {
  const context = useContext(SharedWorkerContext)

  return context
}
