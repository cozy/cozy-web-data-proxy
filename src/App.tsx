import { useClient } from 'cozy-client'

import './App.css';

import { useSharedWorker } from 'src/worker/useSharedWorker';
import { SharedWorkerProvider } from './worker/SharedWorkerProvider';

const App = () => {
  const client = useClient()
	const worker = useSharedWorker()

  return (
    <div className="content">
      <h1>Cozy DataProxy</h1>
      <p>{client?.getStackClient().uri}</p>
    </div>
  );
};

const WrappedApp = () => {
  return (
    <SharedWorkerProvider>
      <App />
    </SharedWorkerProvider>
  )
}

export default WrappedApp;
