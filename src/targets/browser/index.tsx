import React from 'react'

import { CozyProvider } from 'cozy-client'

import App from '@/App'

import { setupApp } from './setupApp'

const init = function (): void {
  const { root, client } = setupApp()

  root.render(
    <React.StrictMode>
      <CozyProvider client={client}>
        <App />
      </CozyProvider>
    </React.StrictMode>
  )
}

init()
