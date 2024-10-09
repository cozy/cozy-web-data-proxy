import * as Comlink from 'comlink'

import { useClient } from 'cozy-client'
import Minilog from 'cozy-minilog'

import './App.css';

import { useSharedWorker } from 'src/worker/useSharedWorker';
import { SharedWorkerProvider } from './worker/SharedWorkerProvider';
import { ParentWindowProvider } from './parent/ParentWindowProvider';
import { useEffect, useState } from 'react';

const log = Minilog('🖼️ [DataProxy main]')
Minilog.enable()

const App = () => {
  const client = useClient()
  const worker = useSharedWorker()
  const [workerState, setWorkerState] = useState({})

  useEffect(() => {
    const callback = (event) => {
      console.log('RECEIVED UPDATE', event)
      setWorkerState(() => event)
    }
    worker.onStateUpdate(Comlink.proxy(callback))
  }, [])

  const search = async () => {
    const result = await worker.search('Some Search Query')
    log.debug('result', result)
  }

  return (
    <div className="content">
      <h1>Cozy DataProxy</h1>
      <p>{client?.getStackClient().uri}</p>
      <p>Status: {workerState.status}</p>
      <button onClick={search}>Send message</button>
    </div>
  );
};

const WrappedApp = () => {
  return (
    <SharedWorkerProvider>
      <ParentWindowProvider>
        <App />
      </ParentWindowProvider>
    </SharedWorkerProvider>
  )
}

export default WrappedApp;
