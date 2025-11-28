import CozyClient from 'cozy-client'
import Minilog from 'cozy-minilog'

import { LOCALSTORAGE_KEY_DELETING_DATA } from '@/consts'

import { ClientData } from '../common/DataProxyInterface'
const log = Minilog('👷‍♂️ [Worker utils]')

interface SessionInfo {
  last_seen: string
  long_run: boolean
}

interface SessionResponse {
  data: {
    attributes: SessionInfo
  }
}

export const queryIsTrustedDevice = async (
  client: CozyClient,
  clientData: ClientData
): Promise<boolean> => {
  const resp: SessionResponse = await client
    .getStackClient()
    .fetchJSON('GET', '/settings/sessions/current')

  // Need to get the flag from clientData since cozy-flags are not fully initialized yet
  const flags = clientData.instanceOptions?.flags as
    | Record<string, boolean>
    | undefined

  if (flags?.['dataproxy.force-trusted-device.enabled']) {
    return true
  }

  const isLongRun = resp?.data?.attributes?.long_run
  const isUnDefined = isLongRun === undefined

  if (isUnDefined) {
    return true // special case for twake instances with linagora SSO
  } else {
    return !!isLongRun
  }
}

const deleteDatabases = async (): Promise<void> => {
  if (typeof window.indexedDB?.databases === 'function') {
    const databases = await window.indexedDB.databases()
    // Remove all indexedDB databases
    for (const db of databases) {
      if (db.name) {
        window.indexedDB.deleteDatabase(db.name)
        log.info('Deleted indexedDB database : ', db.name)
      }
    }
  }
}

export const removeStaleLocalData = async (): Promise<void> => {
  // Check flag existence proving the reset process was incomplete
  try {
    const hasStaleData = localStorage.getItem(LOCALSTORAGE_KEY_DELETING_DATA)
    if (hasStaleData) {
      log.info('Found stale data: remove it')
      await deleteDatabases()
      localStorage.removeItem(LOCALSTORAGE_KEY_DELETING_DATA)
    }
  } catch (e) {
    log.error(e)
  }
  return
}
