import React from 'react'

import { useClient } from 'cozy-client'

import './App.css'

const App = (): JSX.Element => {
  const client = useClient()

  return (
    <div className="content">
      <h1>Cozy DataProxy</h1>
      <p>{client?.getStackClient().uri}</p>
    </div>
  )
}

export default App
