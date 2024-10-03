import React from 'react';
import ReactDOM from 'react-dom/client';

import { CozyProvider } from 'cozy-client';

import App from 'src/App';
import { setupApp } from './setupApp';


const init = function () {
  const { root, client } = setupApp()

  root.render(
    <React.StrictMode>
      <CozyProvider client={client}>
        <App />
      </CozyProvider>
    </React.StrictMode>,
  );
}

init()
