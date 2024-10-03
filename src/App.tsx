import { useClient } from 'cozy-client'

import './App.css';

import { useSharedWorker } from 'src/worker/useSharedWorker'

const App = () => {
  const client = useClient()
	const { sendMessage } = useSharedWorker()

  return (
    <div className="content">
      <h1>Cozy DataProxy</h1>
      <p>{client?.getStackClient().uri}</p>
      <button onClick={sendMessage}>Send message</button>
    </div>
  );
};

export default App;
