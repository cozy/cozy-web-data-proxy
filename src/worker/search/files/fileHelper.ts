import CozyClient, { generateWebLink, models } from "cozy-client";
import { IOCozyFile } from "cozy-client/types/types";

import { FileClass, NormalizedFile } from "../types";

export const FILES_DOCTYPE = 'io.cozy.files'
export const CONTACTS_DOCTYPE = 'io.cozy.contacts'
export const APPS_DOCTYPE = 'io.cozy.apps'

export const ROOT_DIR_ID = 'io.cozy.files.root-dir'
export const TRASH_DIR_ID = 'io.cozy.files.trash-dir'
export const SHARED_DRIVES_DIR_ID = 'io.cozy.files.shared-drives-dir' // This folder mostly contains external drives like Nextcloud
export const TYPE_DIRECTORY = 'directory'

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
export const makeNormalizedFile = (client: CozyClient, folders: IOCozyFile[], file:IOCozyFile): NormalizedFile => {
  console.log('makeNormalizedFile', folders, file)
  const isDir = file.type === TYPE_DIRECTORY
  const dirId = isDir ? file._id : file.dir_id
  const urlHash = `/folder/${dirId}`
  const urlToFolder = generateWebLink({
    cozyUrl: client.getStackClient().uri,
    slug: 'drive',
    // @ts-ignore
    subDomainType: client.getInstanceOptions().subdomain,
    hash: urlHash,
    pathname: '',
    searchParams: []
  })
  console.log('urlToFolder : ', urlToFolder);

  let path, url, parentUrl
  let openOn = 'drive'
  if (isDir) {
    path = file.path!
    url = urlToFolder
    parentUrl = urlToFolder
  } else {
    const parentDir = folders.find(folder => folder._id === file.dir_id)
    path = parentDir && parentDir.path ? parentDir.path : ''
    parentUrl = parentDir && parentDir._id ? `#/folder/${parentDir._id}` : ''
    if (models.file.isNote(file)) {
      url = `/n/${file.id}`
      openOn = 'notes'
    } else if (models.file.shouldBeOpenedByOnlyOffice(file)) {
      url = makeOnlyOfficeFileRoute(file.id!, { fromPathname: urlToFolder })
    } else {
      url = `${urlToFolder}/file/${file._id}`
    }
  }

  return {
    id: file._id,
    type: file.type,
    name: file.name,
    mime: file.mime,
    class: file.class as FileClass,
    path,
    url,
    parentUrl,
    openOn
  }
}


interface OnlyOfficeFileRouteOptions {
  /**
   * The document will be opened in edit mode
   */
  fromCreate?: boolean
  /**
   * Hash to redirect the user when he back
   */
  fromPathname?: string
  /**
   * To forward existing redirectLink
   */
  fromRedirect?: boolean
  /**
   * The document will be opened in edit mode
   */
  fromEdit?: boolean
  /**
   * The document is opened from a public folder
   */
  fromPublicFolder?: boolean
}

/**
 * Make hash to redirect user to an OnlyOffice file
 * @param {string} fileId Id of the OnlyOffice file
 * @param {OnlyOfficeFileRouteOptions} [options] Options

 * @returns {string} Path to OnlyOffice
 */
const makeOnlyOfficeFileRoute = (fileId: string, options: OnlyOfficeFileRouteOptions) => {
  const {
    fromCreate = false,
    fromPathname,
    fromRedirect,
    fromEdit = false,
    fromPublicFolder = false
  } = options || {}

  const params = new URLSearchParams()
  if (fromCreate) {
    params.append('fromCreate', true.toString())
  }
  if (fromPathname) {
    params.append('redirectLink', `drive#${fromPathname}`)
  }
  if (fromRedirect) {
    params.append('redirectLink', fromRedirect.toString())
  }
  if (fromEdit) {
    params.append('fromEdit', fromEdit.toString())
  }
  if (fromPublicFolder) {
    params.append('fromPublicFolder', fromPublicFolder.toString())
  }

  const searchParam = params.size > 0 ? `?${params.toString()}` : ''
  return `/onlyoffice/${fileId}${searchParam}`
}
