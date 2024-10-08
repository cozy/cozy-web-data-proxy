import FlexSearch from 'flexsearch'
// @ts-ignore
import { encode as encode_balance } from 'flexsearch/dist/module/lang/latin/balance';

import CozyClient from 'cozy-client'
import Minilog from 'cozy-minilog'

import { SEARCH_SCHEMA } from 'src/consts'
import { queryFilesForSearch, queryAllContacts, queryAllApps } from 'src/worker/queries'
import { CozyDoc } from 'src/worker/search/types';

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
  return [filesIndex, contactsIndex, appsIndex]
}

export const searchOnIndexes = (query: string, indexes: FlexSearch.Document<CozyDoc, true>[]) => {
  log.debug('Searching on indexes')
  let searchResults: FlexSearch.EnrichedDocumentSearchResultSetUnit<CozyDoc>[] = []
  for (const index of indexes) { 
    const results = index.search(query, 10, { enrich: true})
    searchResults = searchResults.concat(results)
  }
  log.debug('Finished seaching on indexes')
  return searchResults
}

export const deduplicateAndFlatten = (searchResults: FlexSearch.EnrichedDocumentSearchResultSetUnit<CozyDoc>[]) => {
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

const indexDocs = (doctype: keyof typeof SEARCH_SCHEMA, docs: CozyDoc[]) => {
  const fieldsToIndex = SEARCH_SCHEMA[doctype]

  const flexsearchIndex = new FlexSearch.Document<CozyDoc, true>({
    tokenize: 'forward',
    encode: encode_balance,
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
