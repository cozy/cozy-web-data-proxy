import React from 'react'

import { useClient } from 'cozy-client'
import Minilog from 'cozy-minilog'

import { ParentWindowProvider } from '@/dataproxy/parent/ParentWindowProvider'
import { SharedWorkerProvider } from '@/dataproxy/worker/SharedWorkerProvider'
import { useSharedWorker } from '@/dataproxy/worker/useSharedWorker'

import './App.css'

Minilog.enable()

const App = (): JSX.Element => {
  const client = useClient()
  const { worker, workerState } = useSharedWorker()

  return (
    <div className="content">
      <h1>Cozy DataProxy</h1>
      <p>
        This is a technical app in your Cozy. It is used to mutualize local data
        between your apps and provide sync and local access to it.
      </p>
      <p>URL: {client?.getStackClient().uri}</p>
      <p>Status: {workerState.status}</p>
      <p>Count: {workerState.tabCount}</p>
      {workerState.indexLength?.map(indexLength => {
        return (
          <p>
            - {indexLength.doctype}: {indexLength.count} documents
          </p>
        )
      })}
      <button
        onClick={() => {
          worker.forceSyncPouch()
        }}
      >
        Force sync
      </button>
    </div>
  )
}

const WrappedApp = (): JSX.Element => {
  return (
    <SharedWorkerProvider>
      <ParentWindowProvider>
        <App />
      </ParentWindowProvider>
    </SharedWorkerProvider>
  )
}

export default WrappedApp
