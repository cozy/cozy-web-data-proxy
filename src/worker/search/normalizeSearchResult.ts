import CozyClient, { generateWebLink, models } from 'cozy-client'

import { SearchResult } from 'src/common/DataProxyInterface'
import { TYPE_DIRECTORY } from 'src/consts'
import { CozyDoc, isIOCozyApp, isIOCozyContact, isIOCozyFile } from 'src/worker/search/types'

export const normalizeSearchResult = (client: CozyClient, doc: CozyDoc): SearchResult => {
  const url = buildOpenURL(client, doc)
  const type = getSearchResultSlug(doc)
  const title = getSearchResultTitle(doc)
  const name = getSearchResultSubTitle(doc)
  // TODO: add mime for file icon
  const normalizedDoc = {doc, type, title, name, url}

  return normalizedDoc
}

const getSearchResultTitle = (doc: CozyDoc) => {
  if (isIOCozyFile(doc)) {
    return doc.name
  }

  if (isIOCozyContact(doc)) {
    // TODO: display name contact déjà calculé ?
    return doc.fullname // TODO: adapt if there is no fullname
  }

  if (isIOCozyApp(doc)) {
    return doc.name
  }

  return null
}

// TODO: compute the subtitle based on field match, if it is not the main title?
const getSearchResultSubTitle = (doc: CozyDoc) => {
  if (isIOCozyFile(doc)) {
    return doc.path
  }

  if (isIOCozyContact(doc)) {
    return '' // TODO: display phone or email or address if it exists?
  }

  if (isIOCozyApp(doc)) {
    return doc.description // utiliser short_description locale manifest via cozy-client 
  }

  return null
}

const getSearchResultSlug = (doc: CozyDoc) => {
  if (isIOCozyFile(doc)) {
    if (models.file.isNote(doc)) {
      return 'notes'
    }

    return 'drive'
  }

  if (isIOCozyContact(doc)) {
    return 'contacts'
  }

  if (isIOCozyApp(doc)) {
    return doc.slug
  }

  return null
}

const buildOpenURL = (client: CozyClient, doc: CozyDoc) => {
  let urlHash = ''
  const slug = getSearchResultSlug(doc)

  if (isIOCozyFile(doc)) {
    const isDir = doc.type === TYPE_DIRECTORY
    const dirId =  isDir ? doc._id : doc.dir_id
    const folderURLHash = `/folder/${dirId}`

    if (models.file.isNote(doc)) {
      urlHash = `/n/${doc._id}`
    } else if (models.file.shouldBeOpenedByOnlyOffice(doc)) {
      // Ex: https://paultranvan-drive.mycozy.cloud/#/onlyoffice/cf82c604-3e2c-c656-741c-624c328d3404?redirectLink=drive%23%2Ffolder%2Fd2af6f38733f7efd68130804beefbc15
      // TODO: extract in cozy-client
      urlHash = `/onlyoffice/${doc._id}?redirectLink=drive${folderURLHash}`
    } else if (isDir) {
      urlHash = folderURLHash
    } else {
      urlHash = `${folderURLHash}/file/${doc._id}`
    }
  }

  if (isIOCozyContact(doc)) {
    urlHash = `/${doc._id}`
  }

  if (!slug) {
    return null
  }

  return generateWebLink({
    cozyUrl: client.getStackClient().uri,
    slug,
    // @ts-ignore
    subDomainType: client.getInstanceOptions().subdomain,
    hash: urlHash,
    pathname: '',
    searchParams: []
  })
}
