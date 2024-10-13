import FlexSearch from 'flexsearch'
// @ts-ignore
import { encode as encode_balance } from 'flexsearch/dist/module/lang/latin/balance'

import CozyClient from 'cozy-client'
import Minilog from 'cozy-minilog'

import {
  SEARCH_SCHEMA,
  APPS_DOCTYPE,
  FILES_DOCTYPE,
  CONTACTS_DOCTYPE
} from '@/search/consts'
import {
  queryFilesForSearch,
  queryAllContacts,
  queryAllApps
} from '@/search/queries'
import { CozyDoc, SearchIndex } from '@/search/types'

const log = Minilog('🗂️ [Indexing]')

export const initIndexes = async (
  client: CozyClient
): Promise<SearchIndex[]> => {
  log.debug('Initializing indexes')

  const files = await queryFilesForSearch(client)
  const filesIndex = indexDocs('io.cozy.files', files)

  const contacts = await queryAllContacts(client)
  const contactsIndex = indexDocs('io.cozy.contacts', contacts)

  const apps = await queryAllApps(client)
  const appsIndex = indexDocs('io.cozy.apps', apps)

  log.debug('Finished initializing indexes')
  return [
    { index: filesIndex, doctype: FILES_DOCTYPE },
    { index: contactsIndex, doctype: CONTACTS_DOCTYPE },
    { index: appsIndex, doctype: APPS_DOCTYPE }
  ]
}

const indexDocs = (
  doctype: keyof typeof SEARCH_SCHEMA,
  docs: CozyDoc[]
): FlexSearch.Document<CozyDoc, true> => {
  const fieldsToIndex = SEARCH_SCHEMA[doctype]

  const flexsearchIndex = new FlexSearch.Document<CozyDoc, true>({
    tokenize: 'forward',
    encode: encode_balance as FlexSearch.Encoders,
    // @ts-expect-error IndexOptions.minlength is not TS typed
    minlength: 2,
    document: {
      id: '_id',
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
