//import { Document } from 'flexsearch'
import Document from 'flexsearch/dist/module/document.js'
import { encode } from "flexsearch/dist/module/lang/latin/balance.js";

import { queryFilesForSearch, queryAllContacts, queryAllApps } from 'src/queries'
import CozyClient, { generateWebLink, models } from 'cozy-client'
import { CozyDocs, CozyDoc, SearchResult } from 'src/common/DataProxyInterface'
import {FILES_DOCTYPE, CONTACTS_DOCTYPE, APPS_DOCTYPE,  SEARCH_SCHEMA, TYPE_DIRECTORY } from 'src/consts'
import { IOCozyFile, IOCozyContact, IOCozyApp } from 'cozy-client/types/types'
import { DocumentSearchResult } from 'flexsearch';

const isIOCozyFile = (doc: CozyDoc): doc is IOCozyFile => {
  return doc._type === FILES_DOCTYPE
}

const isIOCozyContact = (doc: CozyDoc): doc is IOCozyContact => {
  return doc._type === CONTACTS_DOCTYPE
}

const isIOCozyApp = (doc: CozyDoc): doc is IOCozyApp => {
  return doc._type === APPS_DOCTYPE
}

export const initIndexes = async (client: CozyClient) => {
  const files = await queryFilesForSearch(client)
  const filesIndex = indexDocs("io.cozy.files", files)
  const contacts = await queryAllContacts(client)
  const contactsIndex = indexDocs("io.cozy.contacts", contacts)
  const apps = await queryAllApps(client)
  const appsIndex = indexDocs("io.cozy.apps", apps)

  return [appsIndex, filesIndex, contactsIndex]
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
  return null
}

const findMatchingValueInArray = (query, items, attribute) => {
  for (const item of items) {
    if (item[attribute].includes(query)) {
      return item[attribute]
    }
  }
}

const getSearchResultSubTitle = (client: CozyClient, searchResult: SearchResult, query: string) => {
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
    if (matchingField === 'email[]:address') {
      matchingValue = findMatchingValueInArray(query, searchResult.doc.email, 'address')
      if (!matchingValue) {
        // No matching value found, but we now it's an email, so let's take the first one
        return searchResult.doc.email && searchResult.doc.email[0]
      }
    } else if (matchingField === 'address[]:formattedAddress') {
      matchingValue = findMatchingValueInArray(query, searchResult.doc.address, 'formattedAddress')
      if (!matchingValue) {
        // No matching value found, but we now it's an address, so let's take the first one
        return searchResult.doc.address && searchResult.doc.address[0]
      }
    } else if (matchingField === 'phone[]:number') {
      matchingValue = findMatchingValueInArray(query, searchResult.doc.phone, 'number')
        if (!matchingValue) {
        // No matching value found, but we now it's a phone, so let's take the first one
        return searchResult.doc.phone && searchResult.doc.phone[0]
      }
    } else if (matchingField === 'cozy[]:url') {
      matchingValue = findMatchingValueInArray(query, searchResult.doc.cozy, 'url')
        if (!matchingValue) {
        // No matching value found, but we now it's an cozy URL, so let's take the first one
        return searchResult.doc.cozy && searchResult.doc.cozy[0]
      }
    } else {
      matchingValue = searchResult.doc[matchingField]
    }
    console.log('matching value contact : ', matchingValue);

    return matchingValue
  }
  if (searchResult.doc._type === APPS_DOCTYPE) {
    const locale = client.instanceOptions.locale || 'en'
    if (searchResult.doc.locales[locale]) {
      return searchResult.doc.locales[locale].short_description
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
  const subDomain = client.getInstanceOptions().subdomain
  return generateWebLink({cozyUrl: client.getStackClient().uri, slug, subDomainType: subDomain, hash: urlHash, searchParams: [], pathname: ''})
}


export const deduplicateAndFlatten = (searchResults: DocumentSearchResult<true>[]) => {
  const combinedResults = searchResults.flatMap(item => 
    item.result.map(r => ({ ...r, field: item.field }))
  )

  const resultMap = new Map()

  combinedResults.forEach(({ id, field, ...rest }) => {
    if (resultMap.has(id)) {
      resultMap.get(id).fields.push(field)
    } else {
      resultMap.set(id, { id, fields: [field], ...rest })
    }
  })

  return [...resultMap.values()]
}

export const normalizeSearchResult = (client: CozyClient, searchResult: SearchResult, query: string) => {
  console.log('normalize doc :  ', searchResult.doc)
  const url = buildOpenURL(client, searchResult.doc)
  const type = getSearchResultSlug(searchResult.doc)
  const title = getSearchResultTitle(searchResult.doc)
  const name = getSearchResultSubTitle(client, searchResult, query)
  const normalizedDoc = {...searchResult.doc, type, title, name, url}
  return normalizedDoc
}

export const searchOnIndexes = (query: string, indexes: Document[]) => {
  let searchResults: DocumentSearchResult<true> = []
  for (const index of indexes) { 
    const results = index.search(query, 10, { enrich: true})
    searchResults = searchResults.concat(results)
  }
  return searchResults
}


const indexDocs = (doctype: string, docs: CozyDocs) => {

  const fieldsToIndex = SEARCH_SCHEMA[doctype]
  console.log('fields to index : ', fieldsToIndex)
  const flexsearchIndex = new Document({
    tokenize: 'forward',
    encode,
    store: true,
    document: {
      id: "_id",
      index: fieldsToIndex,
      store: true
    }
  })
  console.log('[INDEX] start index docs')
  console.log('first doc to index: ', docs[0])
  console.time('indexDocs')
  for (const doc of docs) {
    console.log('Add doc : ', doc)
    flexsearchIndex.add(doc)
  }
  console.timeEnd('indexDocs')

  return flexsearchIndex
}
