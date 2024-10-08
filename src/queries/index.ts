import CozyClient, { generateWebLink, Q } from 'cozy-client'
import { AllDocsResponse, CozyDocs } from 'src/common/DataProxyInterface'
import { IOCozyFile, FileDocument, FolderDocument, IOCozyContact, QueryResult } from 'cozy-client/types/types'
import {FILES_DOCTYPE, CONTACTS_DOCTYPE, APPS_DOCTYPE, TYPE_DIRECTORY, ROOT_DIR_ID, SHARED_DRIVES_DIR_ID } from 'src/consts'




export const queryFilesForSearch = async (client: CozyClient): Promise<CozyDocs> => {
  const resp: AllDocsResponse = await client
    .getStackClient()
    .fetchJSON(
      'GET',
      '/data/io.cozy.files/_all_docs?Fields=_id,trashed,dir_id,name,path,type,mime,class,metadata.title,metadata.version&DesignDocs=false&include_docs=true'
    )
  const files = resp.rows.map(row => ({ id: row.id, ...row.doc }))
  const folders = files.filter(file => file.type === TYPE_DIRECTORY)

  const notInTrash = (file:IOCozyFile) => !file.trashed && !/^\/\.cozy_trash/.test(file.path)
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

  const normalizedFiles = normalizedFilesPrevious.map(file =>
    makeNormalizedFile(client, folders, file)
  )

  return normalizedFiles
}

export const normalizeString = str =>
  str
    .toString()
    .toLowerCase()
    .replace(/\//g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(' ')

/**
 * Normalize file for Front usage in <AutoSuggestion> component inside <BarSearchAutosuggest>
 *
 * To reduce API call, the fetching of Note URL has been delayed
 * inside an onSelect function called only if provided to <BarSearchAutosuggest>
 * see https://github.com/cozy/cozy-drive/pull/2663#discussion_r938671963
 *
 * @param {CozyClient} client - cozy client instance
 * @param {[IOCozyFile]} folders - all the folders returned by API
 * @param {IOCozyFile} file - file to normalize
 * @returns file with normalized field to be used in AutoSuggestion
 */
// export const makeNormalizedFile = (client, folders, file) => {
//   const isDir = file.type === TYPE_DIRECTORY
//   const dirId = isDir ? file._id : file.dir_id
//   const urlHash = `/folder/${dirId}`
//   console.log('subodmain : ', client.getInstanceOptions().subdomain);
//   const urlToFolder = generateWebLink({cozyUrl: client.getStackClient().uri, slug: 'drive', subDomainType: client.getInstanceOptions().subdomain, hash: urlHash})
//   console.log('urlToFolder : ', urlToFolder);

//   let path, url, parentUrl
//   let openOn = 'drive'
//   if (isDir) {
//     path = file.path
//     url = urlToFolder
//     parentUrl = urlToFolder
//   } else {
//     const parentDir = folders.find(folder => folder._id === file.dir_id)
//     path = parentDir && parentDir.path ? parentDir.path : ''
//     parentUrl = parentDir && parentDir._id ? `#/folder/${parentDir._id}` : ''
//     if (models.file.isNote(file)) {
//       url = `/n/${file.id}`
//       openOn = 'notes'
//     } else if (models.file.shouldBeOpenedByOnlyOffice(file)) {
//       url = makeOnlyOfficeFileRoute(file.id, { fromPathname: urlToFolder })
//     } else {
//       url = `${urlToFolder}/file/${file._id}`
//     }
//   }

//   return {
//     id: file._id,
//     _id: file._id,
//     _type: 'io.cozy.files',
//     type: file.type,
//     name: file.name,
//     mime: file.mime,
//     class: file.class,
//     path,
//     url,
//     parentUrl,
//     openOn
//   }
// }

export const makeNormalizedFile = (client, folders, file) => {
  const isDir = file.type === TYPE_DIRECTORY
  let path = ''
  if (isDir) {
    path = file.path
  } else {
    const parentDir = folders.find(folder => folder._id === file.dir_id)
    path = parentDir && parentDir.path ? parentDir.path : ''
  }
  return {...file, _type: 'io.cozy.files', path}
}



export const queryAllContacts = (client: CozyClient): Promise<CozyDocs> => {
  return client.queryAll(Q(CONTACTS_DOCTYPE).limitBy(1000))
}

export const queryAllApps = (client: CozyClient): Promise<CozyDocs> => {
  return client.queryAll(Q(APPS_DOCTYPE).limitBy(1000))
}