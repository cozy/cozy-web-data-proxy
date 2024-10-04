import { useClient } from 'cozy-client'

import './App.css';

import { useSharedWorker } from 'src/worker/useSharedWorker'
import { useParentWindow } from './parent/useParentWindow';
import { SharedWorkerProvider } from './worker/SharedWorkerProvider';
import { ParentWindowProvider } from './parent/ParentWindowProvider';

const App = () => {
  const client = useClient()
	const worker = useSharedWorker()
  // useParentWindow()

  const search = async () => {
    const resultt = await worker.search('aze')
    console.log('result', resultt)
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
