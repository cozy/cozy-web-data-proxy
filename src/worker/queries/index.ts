import CozyClient, { generateWebLink, Q } from 'cozy-client'
import { IOCozyFile } from 'cozy-client/types/types'
import { TYPE_DIRECTORY, ROOT_DIR_ID, SHARED_DRIVES_DIR_ID, makeNormalizedFile, CONTACTS_DOCTYPE, APPS_DOCTYPE } from '../search/files/fileHelper'
import { AllDocsResponse, CozyDoc } from '../search/types'


export const queryFilesForSearch = async (client: CozyClient): Promise<CozyDoc[]> => {
  const resp: AllDocsResponse = await client
    .getStackClient()
    .fetchJSON(
      'GET',
      '/data/io.cozy.files/_all_docs?Fields=_id,trashed,dir_id,name,path,type,mime,class,metadata.title,metadata.version&DesignDocs=false&include_docs=true'
    )
    console.log({resp})
  const files = resp.rows.map(row => ({ id: row.id, ...row.doc }) as IOCozyFile)
  const folders = files.filter(file => file.type === TYPE_DIRECTORY)

  console.log({files, folders})

  // @ts-ignore
  const notInTrash = (file:IOCozyFile) => !file.trashed && !/^\/\.cozy_trash/.test(file.path ?? '')
  const notOrphans = (file:IOCozyFile) =>
    folders.find(folder => folder._id === file.dir_id) !== undefined
  const notRoot = (file: IOCozyFile) => file._id !== ROOT_DIR_ID
  // Shared drives folder to be hidden in search.
  // The files inside it though must appear. Thus only the file with the folder ID is filtered out.
  const notSharedDrivesDir = (file: IOCozyFile) => file._id !== SHARED_DRIVES_DIR_ID

  const normalizedFilesPrevious = files.filter(
    file =>
      notInTrash(file) &&
      notOrphans(file) &&
      notRoot(file) &&
      notSharedDrivesDir(file)
  )
  console.log('normalizedFilesPrevious', normalizedFilesPrevious)

  const normalizedFiles = normalizedFilesPrevious.map(file =>
    makeNormalizedFile(client, folders, file)
  )

  return normalizedFiles
}

export const queryAllContacts = (client: CozyClient): Promise<CozyDoc[]> => {
  return client.queryAll(Q(CONTACTS_DOCTYPE).limitBy(1000))
}

export const queryAllApps = (client: CozyClient): Promise<CozyDoc[]> => {
  return client.queryAll(Q(APPS_DOCTYPE).limitBy(1000))
}
