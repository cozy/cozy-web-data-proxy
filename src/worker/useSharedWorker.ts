import { useEffect, useState } from 'react'

export const useSharedWorker = () => {
  const [worker, setWorker] = useState<SharedWorker | undefined>()

  useEffect(() => {
    const workerInst = new SharedWorker(new URL('./shared-worker.ts', import.meta.url), {
      name: 'dataproxy-worker',
    });

    workerInst.port.addEventListener('message', e => {
      console.log('REACT RECEIVED', e)
    })
    console.log('START PROCESS')
    workerInst.port.start()
    workerInst.port.postMessage('hello')
    setWorker(workerInst)
  }, [])


  const sendMessage = () => {
    if (worker) {
      console.log('SEND FROM BUTTON')
      worker.port.postMessage('hello')
    }
  }

  return {
    sendMessage
  }
}
