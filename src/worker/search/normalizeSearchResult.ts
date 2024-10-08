import CozyClient, { generateWebLink, models } from 'cozy-client'

import { SearchResult } from 'src/common/DataProxyInterface'
import { APPS_DOCTYPE, TYPE_DIRECTORY } from 'src/consts'
import { CozyDoc, isIOCozyApp, isIOCozyContact, isIOCozyFile } from 'src/worker/search/types'

export interface RawSearchResult {
  fields: string[]
  doc: CozyDoc
}

export const normalizeSearchResult = (client: CozyClient, searchResults: RawSearchResult, query: string): SearchResult => {
  const url = buildOpenURL(client, searchResults.doc)
  const type = getSearchResultSlug(searchResults.doc)
  const title = getSearchResultTitle(searchResults.doc)
  const name = getSearchResultSubTitle(client, searchResults, query)
  // TODO: add mime for file icon
  const normalizedDoc = {doc: searchResults.doc, type, title, name, url}

  return normalizedDoc
}

const getSearchResultTitle = (doc: CozyDoc) => {
  if (isIOCozyFile(doc)) {
    return doc.name
  }

  if (isIOCozyContact(doc)) {
    return doc.displayName
  }

  if (isIOCozyApp(doc)) {
    return doc.name
  }
}

const findMatchingValueInArray = (query: string, items: any[], attribute: string) => {
  for (const item of items) {
    if (item[attribute].includes(query)) {
      return item[attribute]
    }
  }
}

const getSearchResultSubTitle = (client: CozyClient, searchResult: RawSearchResult, query: string) => {
  if (isIOCozyFile(searchResult.doc)) {
    return searchResult.doc.path
  }
  if (isIOCozyContact(searchResult.doc)) {
    let matchingValue

    // Several document fields might match a search query. Let's take the first one different from name, assuming a relevance order 
    const matchingField = searchResult.fields.find(field => field !== 'displayName' && field !== 'fullname')
    if (!matchingField) {
      return null
    }
    console.log('look for field ', matchingField)
    if (matchingField.includes('[]:')) {
      const tokens = matchingField.split('[]:')
      if (tokens.length !== 2) {
        return null
      }
      const arrayAttributeName = tokens[0]
      const valueAttribute = tokens[1]

      const matchingArrayItem = searchResult.doc[arrayAttributeName] && searchResult.doc[arrayAttributeName].find(item => {
        return (item[valueAttribute] && item[valueAttribute].includes(query))
      })
      matchingValue = matchingArrayItem[valueAttribute]
    }

   else {
      matchingValue = searchResult.doc[matchingField]
    }
    console.log('matching value contact : ', matchingValue);

    return matchingValue
  }
  if (searchResult.doc._type === APPS_DOCTYPE) {
    try {
      // @ts-ignore
      const locale = client.instanceOptions.locale || 'en'
      if (searchResult.doc.locales[locale]) {
        return searchResult.doc.locales[locale].short_description
      }
    } catch {
      return searchResult.doc.name
    }
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
