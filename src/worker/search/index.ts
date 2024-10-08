import FlexSearch from 'flexsearch'
// @ts-ignore
import { encode as encode_balance } from 'flexsearch/dist/module/lang/latin/balance';

import CozyClient from 'cozy-client'

import { queryFilesForSearch, queryAllContacts, queryAllApps } from 'src/worker/queries'
import { CozyDoc } from 'src/worker/search/types';


export const initIndexes = async (client: CozyClient) => {
  console.log('lets init indexes');

  const files = await queryFilesForSearch(client)
  const filesIndex = indexDocs(files)
  
  const contacts = await queryAllContacts(client)
  const contactsIndex = indexDocs(contacts)

  const apps = await queryAllApps(client)
  const appsIndex = indexDocs(apps)

  return [filesIndex, contactsIndex, appsIndex]
}

export const searchOnIndexes = (query: string, indexes: FlexSearch.Document<CozyDoc, true>[]) => {
  let res: FlexSearch.EnrichedDocumentSearchResultSetUnit<CozyDoc>[] = []
  for (const index of indexes){ 
    const results = index.search(query, 10, { enrich: true})
    res = res.concat(results)
  }
  return res
}


const indexDocs = (docs: CozyDoc[]) => {
  const flexsearchIndex = new FlexSearch.Document<CozyDoc, true>({
    tokenize: 'forward',
    encode: encode_balance,
    document: {
      id: "id",
      index: Object.keys(docs[0]),
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
