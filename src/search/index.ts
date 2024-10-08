//import { Document } from 'flexsearch'
import Document from 'flexsearch/dist/module/document.js'
import { encode } from "flexsearch/dist/module/lang/latin/balance.js";

import { queryFilesForSearch, queryAllContacts, queryAllApps } from 'src/queries'
import CozyClient, { generateWebLink, models } from 'cozy-client'
import { CozyDocs, CozyDoc } from 'src/common/DataProxyInterface'
import {FILES_DOCTYPE, CONTACTS_DOCTYPE, APPS_DOCTYPE,  SEARCH_SCHEMA, TYPE_DIRECTORY } from 'src/consts'

//import { shouldBeOpenedByOnlyOffice, isNote } from 'cozy-client/dist/models/file'

export const initIndexes = async (client: CozyClient) => {
  console.log('lets init indexes');

  const files = await queryFilesForSearch(client)
  console.log('files : ', files);
  const filesIndex = indexDocs("io.cozy.files", files)
  const contacts = await queryAllContacts(client)
  const contactsIndex = indexDocs("io.cozy.contacts", contacts)
  const apps = await queryAllApps(client)
  const appsIndex = indexDocs("io.cozy.apps", apps)

  // ---- BEGIN TEST
  const flexsearchIndexTest = new Document({
    tokenize: "forward",
    document: {
      id: "id",
      index: ["foo"],
      store: true
    }
  })
  flexsearchIndexTest.add({id: 10000, foo: "yannick"})
  const res1 = flexsearchIndexTest.search("yannick", { enrich: true })
  const res2 = flexsearchIndexTest.search("yann",  { enrich: true })
  const res3 = flexsearchIndexTest.search("foo", { enrich: true })
  console.log('[TEST] res search test : ', res1, res2, res3);
  console.log('[TEST] index content : ', flexsearchIndexTest);
  // ---- END TEST


  return [appsIndex, filesIndex, contactsIndex]
}


const getSearchResultTitle = (doc: CozyDoc) => {
  if (doc._type === FILES_DOCTYPE) {
    return doc.name
  }
  if (doc._type === CONTACTS_DOCTYPE) {
    // TODO: display name contact déjà calculé ?
    return doc.fullname // TODO: adapt if there is no fullname
  }
  if (doc._type === APPS_DOCTYPE) {
    return doc.name
  }
  return null
}

// TODO: compute the subtitle based on field match, if it is not the main title?
const getSearchResultSubTitle = (doc: CozyDoc) => {
  if (doc._type === FILES_DOCTYPE) {
    return doc.path
  }
  if (doc._type === CONTACTS_DOCTYPE) {
    return '' // TODO: display phone or email or address if it exists?
  }
  if (doc._type === APPS_DOCTYPE) {
    return doc.description // utiliser short_description locale manifest via cozy-client 
  }
  return null
}

const getSearchResultSlug = (doc: CozyDoc) => {
  if (doc._type === FILES_DOCTYPE) {
    if (models.file.isNote(doc)) {
      return 'notes'
    }
    return 'drive'
  }
  if (doc._type === CONTACTS_DOCTYPE) {
    return 'contacts'
  }
  if (doc._type === APPS_DOCTYPE) {
    return doc.slug
  }
  return null
}

const buildOpenURL = (client: CozyClient, doc: CozyDoc) => {
  let urlHash = ''
  const slug = getSearchResultSlug(doc)

  if (doc._type === FILES_DOCTYPE) {
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
  if (doc._type === CONTACTS_DOCTYPE) {
    urlHash = `/${doc._id}`
  }
  if (!slug) {
    return null
  }
  return generateWebLink({cozyUrl: client.getStackClient().uri, slug, subDomainType: client.getInstanceOptions().subdomain, hash: urlHash})
}

export const deduplicateAndFlatten = searchResults => {
  const combinedResults = searchResults.flatMap(item => item.result)
  return [...new Map(combinedResults.map(r => [r.id, r])).values()]
}

export const normalizeSearchResult = (client: CozyClient, doc: CozyDoc) => {
  console.log('normalize doc :  ', doc)
  const url = buildOpenURL(client, doc)
  const type = getSearchResultSlug(doc)
  const title = getSearchResultTitle(doc)
  const name = getSearchResultSubTitle(doc)
  // TODO: add mime for file icon
  const normalizedDoc = {...doc, type, title, name, url}
  return normalizedDoc
}

export const searchOnIndexes = (query, indexes) => {
  let searchResults: any = []
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
