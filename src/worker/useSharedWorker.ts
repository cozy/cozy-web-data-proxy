import { useContext } from 'react'

import { SharedWorkerContext } from './SharedWorkerProvider'

export const useSharedWorker = () => {
  const context = useContext(SharedWorkerContext)

  if (!context) {
    throw new Error('Please embed')
  }

  return context
}
