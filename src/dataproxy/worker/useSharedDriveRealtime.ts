import { useEffect } from 'react'

import type CozyClient from 'cozy-client'
import flag from 'cozy-flags'
import Minilog from 'cozy-minilog'

import { DataProxyWorker } from '@/dataproxy/common/DataProxyInterface'

const log = Minilog('👷‍♂️ [useSharedDriveRealtime]')

// Event payload received from cozy realtime for io.cozy.files
type FilesRealtimeEvent = {
  dir_id: string
  class: string
  referenced_by?: Array<{ id?: string }>
}

function isFilesRealtimeEvent(value: unknown): value is FilesRealtimeEvent {
  if (!value || typeof value !== 'object') return false
  return typeof (value as Record<string, unknown>).dir_id === 'string'
}

interface Realtime {
  subscribe: (
    event: 'created' | 'deleted' | 'updated',
    doctype: string,
    handler: (event: unknown) => void
  ) => void
  unsubscribe: (
    event: 'created' | 'deleted' | 'updated',
    doctype: string,
    handler: (event: unknown) => void
  ) => void
}

function hasRealtimePlugin(
  plugins: unknown
): plugins is { realtime: Realtime } {
  return (
    !!plugins &&
    typeof plugins === 'object' &&
    'realtime' in (plugins as Record<string, unknown>) &&
    typeof (plugins as { realtime?: unknown }).realtime === 'object'
  )
}

/**
 * Hook that subscribes to realtime events for shared drives creation and deletion
 * @param client - CozyClient instance
 * @param worker - DataProxyWorker instance
 */
export const useSharedDriveRealtime = (
  client: CozyClient | null,
  worker: DataProxyWorker | undefined
): void => {
  useEffect(() => {
    if (!client || !flag('drive.shared-drive.enabled')) return

    if (!hasRealtimePlugin(client.plugins)) {
      throw new Error(
        'You must include the realtime plugin to use RealTimeQueries'
      )
    }
    const realtime = client.plugins.realtime

    const handleFileCreated = (event: unknown): void => {
      if (!isFilesRealtimeEvent(event)) return
      if (
        event.dir_id === 'io.cozy.files.shared-drives-dir' &&
        event.class === 'shortcut'
      ) {
        const driveId = event?.referenced_by?.[0]?.id
        if (driveId) {
          log.info(`Shared drive ${driveId} created`)
          worker?.addSharedDrive(driveId)
        }
      }
    }
    const handleFileDeleted = (event: unknown): void => {
      if (!isFilesRealtimeEvent(event)) return
      if (
        event.dir_id === 'io.cozy.files.shared-drives-dir' &&
        event.class === 'shortcut'
      ) {
        const driveId = event?.referenced_by?.[0]?.id
        if (driveId) {
          log.info(`Shared drive ${driveId} deleted`)
          worker?.removeSharedDrive(driveId)
        }
      }
    }
    realtime.subscribe('created', 'io.cozy.files', handleFileCreated)
    realtime.subscribe('deleted', 'io.cozy.files', handleFileDeleted)
    return (): void => {
      realtime.unsubscribe('created', 'io.cozy.files', handleFileCreated)
      realtime.unsubscribe('deleted', 'io.cozy.files', handleFileDeleted)
    }
  }, [client, worker])
}
