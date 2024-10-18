import FlexSearch from 'flexsearch'

import CozyClient, { Q } from 'cozy-client'
import Minilog from 'cozy-minilog'
import { RealtimePlugin } from 'cozy-realtime'

import {
  SEARCH_SCHEMA,
  APPS_DOCTYPE,
  FILES_DOCTYPE,
  CONTACTS_DOCTYPE,
  DOCTYPE_ORDER,
  LIMIT_DOCTYPE_SEARCH,
  REPLICATION_DEBOUNCE
} from '@/search/consts'
import { getPouchLink } from '@/search/helpers/client'
import { getSearchEncoder } from '@/search/helpers/getSearchEncoder'
import { normalizeSearchResult } from '@/search/helpers/normalizeSearchResult'
import { startReplicationWithDebounce } from '@/search/helpers/replication'
import {
  queryFilesForSearch,
  queryAllContacts,
  queryAllApps
} from '@/search/queries'
import {
  CozyDoc,
  RawSearchResult,
  isIOCozyApp,
  isIOCozyContact,
  isIOCozyFile,
  SearchedDoctype,
  SearchIndex,
  SearchIndexes,
  SearchResult
} from '@/search/types'

const log = Minilog('🗂️ [Indexing]')

interface FlexSearchResultWithDoctype
  extends FlexSearch.EnrichedDocumentSearchResultSetUnit<CozyDoc> {
  doctype: SearchedDoctype
}

class SearchEngine {
  client: CozyClient
  searchIndexes: SearchIndexes
  debouncedReplication: () => void

  constructor(client: CozyClient) {
    this.client = client
    this.searchIndexes = {}

    this.indexOnChanges()
    this.debouncedReplication = startReplicationWithDebounce(
      client,
      REPLICATION_DEBOUNCE
    )
  }

  indexOnChanges(): void {
    if (!this.client) {
      return
    }
    this.client.on('pouchlink:doctypesync:end', async (doctype: string) => {
      await this.indexDocsForSearch(doctype)
    })
    this.client.on('login', () => {
      // Ensure login is done before plugin register
      this.client.registerPlugin(RealtimePlugin, {})
      this.handleUpdatedOrCreatedDoc = this.handleUpdatedOrCreatedDoc.bind(this)
      this.handleDeletedDoc = this.handleDeletedDoc.bind(this)

      this.subscribeDoctype(this.client, FILES_DOCTYPE)
      this.subscribeDoctype(this.client, CONTACTS_DOCTYPE)
      this.subscribeDoctype(this.client, APPS_DOCTYPE)
    })
  }

  subscribeDoctype(client: CozyClient, doctype: string): void {
    const realtime = this.client.plugins.realtime
    realtime.subscribe('created', doctype, this.handleUpdatedOrCreatedDoc)
    realtime.subscribe('updated', doctype, this.handleUpdatedOrCreatedDoc)
    realtime.subscribe('deleted', doctype, this.handleDeletedDoc)
  }

  handleUpdatedOrCreatedDoc(doc: CozyDoc): void {
    const doctype: string | undefined = doc._type
    if (!doctype) {
      return
    }
    const searchIndex = this.searchIndexes?.[doctype]
    if (!searchIndex) {
      // No index yet: it will be done by querying the local db after first replication
      return
    }
    log.debug('[REALTIME] index doc after update : ', doc)
    searchIndex.index.add(doc)

    this.debouncedReplication()
  }

  handleDeletedDoc(doc: CozyDoc): void {
    const doctype: string | undefined = doc._type
    if (!doctype) {
      return
    }
    const searchIndex = this.searchIndexes?.[doctype]
    if (!searchIndex) {
      // No index yet: it will be done by querying the local db after first replication
      return
    }
    log.debug('[REALTIME] remove doc from index after update : ', doc)
    this.searchIndexes[doctype].index.remove(doc._id)

    this.debouncedReplication()
  }

  buildSearchIndex(
    doctype: keyof typeof SEARCH_SCHEMA,
    docs: CozyDoc[]
  ): FlexSearch.Document<CozyDoc, true> {
    const fieldsToIndex = SEARCH_SCHEMA[doctype]

    const flexsearchIndex = new FlexSearch.Document<CozyDoc, true>({
      tokenize: 'forward',
      encode: getSearchEncoder(),
      minlength: 2,
      document: {
        id: '_id',
        index: fieldsToIndex,
        store: true
      }
    })

    for (const doc of docs) {
      flexsearchIndex.add(doc)
    }

    return flexsearchIndex
  }

  async indexDocsForSearch(doctype: string): Promise<SearchIndex | null> {
    const searchIndex = this.searchIndexes[doctype]
    const pouchLink = getPouchLink(this.client)

    if (!pouchLink) {
      return null
    }

    if (!searchIndex) {
      // First creation of search index
      const docs = await this.client.queryAll(Q(doctype).limitBy(null))
      const index = this.buildSearchIndex(doctype, docs)
      const info = await pouchLink.getDbInfo(doctype)

      this.searchIndexes[doctype] = {
        index,
        lastSeq: info?.update_seq
      }
      return this.searchIndexes[doctype]
    }

    // Incremental index update
    // At this point, the search index are supposed to be already up-to-date,
    // thanks to the realtime.
    // However, we check it is actually the case for safety, and update the lastSeq
    const lastSeq = searchIndex.lastSeq || 0
    const changes = await pouchLink.getChanges(doctype, {
      include_docs: true,
      since: lastSeq
    })

    for (const change of changes.results) {
      if (change.deleted) {
        searchIndex.index.remove(change.id)
      } else {
        const normalizedDoc = { ...change.doc, _type: doctype }
        searchIndex.index.add(normalizedDoc)
      }
    }

    searchIndex.lastSeq = changes.last_seq
    return searchIndex
  }

  initIndexesFromStack = async (): Promise<SearchIndexes> => {
    log.debug('Initializing indexes')

    const files = await queryFilesForSearch(this.client)
    const filesIndex = this.buildSearchIndex('io.cozy.files', files)

    const contacts = await queryAllContacts(this.client)
    const contactsIndex = this.buildSearchIndex('io.cozy.contacts', contacts)

    const apps = await queryAllApps(this.client)
    const appsIndex = this.buildSearchIndex('io.cozy.apps', apps)

    log.debug('Finished initializing indexes')
    this.searchIndexes = {
      [FILES_DOCTYPE]: { index: filesIndex, lastSeq: 0 },
      [CONTACTS_DOCTYPE]: { index: contactsIndex, lastSeq: 0 },
      [APPS_DOCTYPE]: { index: appsIndex, lastSeq: 0 }
    }
    return this.searchIndexes
  }

  search(query: string): SearchResult[] {
    log.debug('[SEARCH] indexes : ', this.searchIndexes)

    if (!this.searchIndexes) {
      // TODO: What if the indexing is running but not finished yet?
      log.warn('[SEARCH] No search index available')
      return []
    }

    const allResults = this.searchOnIndexes(query)
    const results = this.deduplicateAndFlatten(allResults)
    const sortedResults = this.sortAndLimitSearchResults(results)

    return sortedResults
      .map(res => normalizeSearchResult(this.client, res, query))
      .filter(res => res.title)
  }

  searchOnIndexes(query: string): FlexSearchResultWithDoctype[] {
    let searchResults: FlexSearchResultWithDoctype[] = []
    for (const doctype in this.searchIndexes) {
      const index = this.searchIndexes[doctype]
      if (!index) {
        log.warn('[SEARCH] No search index available for ', doctype)
        continue
      }
      // TODO: do not use flexsearch store and rely on pouch storage?
      // It's better for memory, but might slow down search queries
      const indexResults = index.index.search(query, LIMIT_DOCTYPE_SEARCH, {
        enrich: true
      })
      const newResults = indexResults.map(res => ({
        ...res,
        doctype
      }))
      searchResults = searchResults.concat(newResults)
    }
    return searchResults
  }

  deduplicateAndFlatten(
    searchResults: FlexSearchResultWithDoctype[]
  ): RawSearchResult[] {
    const combinedResults = searchResults.flatMap(item =>
      item.result.map(r => ({ ...r, field: item.field, doctype: item.doctype }))
    )

    const resultMap = new Map<FlexSearch.Id[], any>()

    combinedResults.forEach(({ id, field, ...rest }) => {
      if (resultMap.has(id)) {
        resultMap.get(id).fields.push(field)
      } else {
        resultMap.set(id, { id, fields: [field], ...rest })
      }
    })

    return [...resultMap.values()]
  }

  sortAndLimitSearchResults(
    searchResults: RawSearchResult[]
  ): RawSearchResult[] {
    const sortedResults = this.sortSearchResults(searchResults)
    return this.limitSearchResults(sortedResults)
  }

  compareStrings(str1: string, str2: string): number {
    return str1.localeCompare(str2, undefined, { numeric: true })
  }

  sortSearchResults(searchResults: RawSearchResult[]): RawSearchResult[] {
    return searchResults.sort((a, b) => {
      const doctypeComparison =
        DOCTYPE_ORDER[a.doctype] - DOCTYPE_ORDER[b.doctype]
      if (doctypeComparison !== 0) return doctypeComparison
      if (
        a.doctype === APPS_DOCTYPE &&
        isIOCozyApp(a.doc) &&
        isIOCozyApp(b.doc)
      ) {
        return this.compareStrings(a.doc.slug, b.doc.slug)
      } else if (
        a.doctype === CONTACTS_DOCTYPE &&
        isIOCozyContact(a.doc) &&
        isIOCozyContact(b.doc)
      ) {
        return this.compareStrings(a.doc.displayName, b.doc.displayName)
      } else if (
        a.doctype === FILES_DOCTYPE &&
        isIOCozyFile(a.doc) &&
        isIOCozyFile(b.doc)
      ) {
        return this.sortFiles(a, b)
      }

      return 0
    })
  }

  sortFiles(aRes: RawSearchResult, bRes: RawSearchResult): number {
    if (!isIOCozyFile(aRes.doc) || !isIOCozyFile(bRes.doc)) {
      return 0
    }
    if (!aRes.fields.includes('name') || !bRes.fields.includes('name')) {
      return aRes.fields.includes('name') ? -1 : 1
    }
    if (aRes.doc.type !== bRes.doc.type) {
      return aRes.doc.type === 'directory' ? -1 : 1
    }
    return this.compareStrings(aRes.doc.name, bRes.doc.name)
  }

  limitSearchResults(searchResults: RawSearchResult[]): RawSearchResult[] {
    const limitedResults = {
      [APPS_DOCTYPE]: [],
      [CONTACTS_DOCTYPE]: [],
      [FILES_DOCTYPE]: []
    }

    searchResults.forEach(item => {
      const type = item.doctype as SearchedDoctype
      if (limitedResults[type].length < LIMIT_DOCTYPE_SEARCH) {
        limitedResults[type].push(item)
      }
    })

    return [
      ...limitedResults[APPS_DOCTYPE],
      ...limitedResults[CONTACTS_DOCTYPE],
      ...limitedResults[FILES_DOCTYPE]
    ]
  }
}

export default SearchEngine
