import CozyClient, { Q } from 'cozy-client'
import { IOCozyFile } from 'cozy-client/types/types'

import {
  CONTACTS_DOCTYPE,
  APPS_DOCTYPE,
  TYPE_DIRECTORY,
  ROOT_DIR_ID,
  SHARED_DRIVES_DIR_ID
} from '@/search/consts'
import { normalizeFile } from '@/search/helpers/normalizeFile'
import { CozyDoc } from '@/search/types'

interface DBRow {
  id: string
  doc: IOCozyFile
}

interface AllDocsResponse {
  rows: DBRow[]
}

export const queryFilesForSearch = async (
  client: CozyClient
): Promise<CozyDoc[]> => {
  const resp: AllDocsResponse = await client
    .getStackClient()
    .fetchJSON(
      'GET',
      '/data/io.cozy.files/_all_docs?Fields=_id,trashed,dir_id,name,path,type,mime,class,metadata.title,metadata.version&DesignDocs=false&include_docs=true'
    )
  const files = resp.rows.map(row => ({ id: row.id, ...row.doc }) as IOCozyFile)
  const folders = files.filter(file => file.type === TYPE_DIRECTORY)

  const notInTrash = (file: IOCozyFile): boolean =>
    // @ts-expect-error TODO: file.trashed is not TS typed in CozyClient
    !file.trashed && !/^\/\.cozy_trash/.test(file.path ?? '')

  const notOrphans = (file: IOCozyFile): boolean =>
    folders.find(folder => folder._id === file.dir_id) !== undefined

  const notRoot = (file: IOCozyFile): boolean => file._id !== ROOT_DIR_ID

  // Shared drives folder to be hidden in search.
  // The files inside it though must appear. Thus only the file with the folder ID is filtered out.
  const notSharedDrivesDir = (file: IOCozyFile): boolean =>
    file._id !== SHARED_DRIVES_DIR_ID

  const normalizedFilesPrevious = files.filter(
    file =>
      notInTrash(file) &&
      notOrphans(file) &&
      notRoot(file) &&
      notSharedDrivesDir(file)
  )

  const normalizedFiles = normalizedFilesPrevious.map(file =>
    normalizeFile(folders, file)
  )

  return normalizedFiles
}

export const queryAllContacts = (client: CozyClient): Promise<CozyDoc[]> => {
  return client.queryAll(Q(CONTACTS_DOCTYPE).limitBy(1000))
}

export const queryAllApps = (client: CozyClient): Promise<CozyDoc[]> => {
  return client.queryAll(Q(APPS_DOCTYPE).limitBy(1000))
}
