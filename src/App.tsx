import React from 'react'

import { useClient, Q } from 'cozy-client'
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
      <p>{client?.getStackClient().uri}</p>
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
      <div>
        <button
          onClick={async () => {
            console.log('query files')

            const startQ = performance.now()
            const resp = await worker.query(Q('io.cozy.files'))
            const endQ = performance.now()
            console.log(`query DP took ${endQ - startQ} ms`)
            console.log('resp : ', resp)
          }}
        >
          Do query all docs
        </button>
        <button
          onClick={async () => {
            console.log('query files')

            const startQ = performance.now()
            const resp = await worker.query(
              Q('io.cozy.files')
                .where({
                  name: { $gt: null },
                  type: 'directory'
                })
                .indexFields(['name', 'type'])
                .sortBy([{ name: 'desc' }, { type: 'desc' }])
                .limitBy(1000)
            )
            // const resp = await worker.query(
            //   Q('io.cozy.files')
            //     .where({
            //       name: { $gt: 'aa' },
            //       created_at: { $gt: '2024-01-01' }
            //     })
            //     .indexFields(['name', 'created_at'])
            //     .limitBy(1000)
            //     .sortBy([{ name: 'desc' }, { created_at: 'desc' }])
            // )
            const endQ = performance.now()
            console.log(`query DP took ${endQ - startQ} ms`)
            console.log('resp : ', resp)
          }}
        >
          Do query mango
        </button>
      </div>
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
