import { useClient } from 'cozy-client'
import Minilog from 'cozy-minilog'

import './App.css';

import { useSharedWorker } from 'src/worker/useSharedWorker';
import { SharedWorkerProvider } from './worker/SharedWorkerProvider';
import { ParentWindowProvider } from './parent/ParentWindowProvider';

const log = Minilog('🖼️ [DataProxy main]')
Minilog.enable()

const App = () => {
  const client = useClient()
	const worker = useSharedWorker()

  const search = async () => {
    const result = await worker.search('Some Search Query')
    log.debug('result', result)
  }

  return (
    <div className="content">
      <h1>Cozy DataProxy</h1>
      <p>{client?.getStackClient().uri}</p>
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
