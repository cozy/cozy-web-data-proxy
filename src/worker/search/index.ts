import FlexSearch from 'flexsearch'
// @ts-ignore
import { encode as encode_balance } from 'flexsearch/dist/module/lang/latin/balance';

import CozyClient from 'cozy-client'
import Minilog from 'cozy-minilog'

import { SEARCH_SCHEMA, APPS_DOCTYPE, FILES_DOCTYPE, CONTACTS_DOCTYPE, DOCTYPE_ORDER, LIMIT_DOCTYPE_SEARCH } from 'src/consts'
import { queryFilesForSearch, queryAllContacts, queryAllApps } from 'src/worker/queries'
import { CozyDoc } from 'src/worker/search/types';
import { RawSearchResult, SearchIndex } from 'src/common/DataProxyInterface';

const log = Minilog('🗂️ [Indexing]')

export const initIndexes = async (client: CozyClient) => {
  log.debug('Initializing indexes')

  const files = await queryFilesForSearch(client)
  const filesIndex = indexDocs("io.cozy.files", files)

  const contacts = await queryAllContacts(client)
  const contactsIndex = indexDocs("io.cozy.contacts", contacts)

  const apps = await queryAllApps(client)
  const appsIndex = indexDocs("io.cozy.apps", apps)

  log.debug('Finished initializing indexes')
  return [{index: filesIndex, doctype: FILES_DOCTYPE}, { index: contactsIndex, doctype: CONTACTS_DOCTYPE}, {index: appsIndex, doctype: APPS_DOCTYPE}]
}

export const searchOnIndexes = (query: string, indexes: SearchIndex[]) => {
  log.debug('Searching on indexes')
  let searchResults: FlexSearch.EnrichedDocumentSearchResultSetUnit<CozyDoc>[] = []
  for (const index of indexes) { 
    // FIXME: The given limit seems ignored?
    const indexResults = index.index.search(query, LIMIT_DOCTYPE_SEARCH, { enrich: true})
    const newResults = indexResults.map(res => ({...res, doctype: index.doctype}))
    searchResults = searchResults.concat(newResults)
  }
  log.debug('Finished seaching on indexes')
  return searchResults
}

export const deduplicateAndFlatten = (searchResults: FlexSearch.EnrichedDocumentSearchResultSetUnit<CozyDoc>[]) => {
  const combinedResults = searchResults.flatMap(item => 
    item.result.map(r => ({ ...r, field: item.field, doctype: item.doctype }))
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

export const sortAndLimitSearchResults = (searchResults: RawSearchResult[]) => {
  const sortedResults = sortSearchResults(searchResults)
  return limitSearchResults(sortedResults)
}

const sortSearchResults = (searchResults: RawSearchResult[]) => {

  return searchResults.sort((a, b) => {
    // First, sort by doctype order
    const doctypeComparison = DOCTYPE_ORDER[a.doctype] - DOCTYPE_ORDER[b.doctype]
    if (doctypeComparison !== 0) return doctypeComparison


    // Then, sort within each doctype by the specified field
    if (a.doctype === APPS_DOCTYPE) {
      return a.doc.slug.localeCompare(b.doc.slug)
    } else if (a.doctype === CONTACTS_DOCTYPE) {
      return a.doc.displayName.localeCompare(b.doc.displayName)
    } else if (a.doctype === FILES_DOCTYPE) {
      if (a.doc.type !== b.doc.type) {
        return a.doc.type === 'directory' ? -1 : 1
      }
      return a.doc.name.localeCompare(b.doc.name)
    }

    return 0
  })
}

const limitSearchResults = (searchResults: RawSearchResult[]) => {
  const limitedResults = { [APPS_DOCTYPE]: [], [CONTACTS_DOCTYPE]: [], [FILES_DOCTYPE]: [] }
  // Limit the results, grouped by doctype
  searchResults.forEach(item => {
    const type = item.doctype
    if (limitedResults[type].length < LIMIT_DOCTYPE_SEARCH) {
      limitedResults[type].push(item)
    }
  })

  return [...limitedResults[APPS_DOCTYPE], ...limitedResults[CONTACTS_DOCTYPE], ...limitedResults[FILES_DOCTYPE]]
}


const indexDocs = (doctype: keyof typeof SEARCH_SCHEMA, docs: CozyDoc[]) => {
  const fieldsToIndex = SEARCH_SCHEMA[doctype]

  const flexsearchIndex = new FlexSearch.Document<CozyDoc, true>({
    tokenize: 'forward',
    encode: encode_balance,
    minlength: 2,
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
    flexsearchIndex.add(doc)
  }
  console.timeEnd('indexDocs')

  return flexsearchIndex
}
