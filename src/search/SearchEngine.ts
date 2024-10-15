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
  ROOT_DIR_ID,
  SHARED_DRIVES_DIR_ID
} from '@/search/consts'
import { getPouchLink } from '@/search/helpers/client'
import { getSearchEncoder } from '@/search/helpers/getSearchEncoder'
import { normalizeSearchResult } from '@/search/helpers/normalizeSearchResult'
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

  constructor(client: CozyClient) {
    this.client = client
    this.searchIndexes = {}

    this.indexOnChanges()
  }

  indexOnChanges(): void {
    if (!this.client) {
      return
    }
    console.log('this.client', this.client)
    this.client.on('pouchlink:doctypesync:end', async (doctype: string) => {
      // TODO: lock to avoid conflict with concurrent index events?
      await this.indexDocsForSearch(doctype)
    })
    this.client.on('login', () => {
      // Ensure login is done before plgin register
      this.client.registerPlugin(RealtimePlugin, null)
      const realtime = this.client.plugins.realtime
      this.handleUpdatedDoc = this.handleUpdatedDoc.bind(this)
      this.handleDeletedDoc = this.handleDeletedDoc.bind(this)
      // TODO: refactor
      realtime.subscribe('created', FILES_DOCTYPE, this.handleUpdatedDoc)
      realtime.subscribe('updated', FILES_DOCTYPE, this.handleUpdatedDoc)
      realtime.subscribe('deleted', FILES_DOCTYPE, this.handleDeletedDoc)

      realtime.subscribe('created', CONTACTS_DOCTYPE, this.handleUpdatedDoc)
      realtime.subscribe('updated', CONTACTS_DOCTYPE, this.handleUpdatedDoc)
      realtime.subscribe('deleted', CONTACTS_DOCTYPE, this.handleDeletedDoc)

      realtime.subscribe('created', APPS_DOCTYPE, this.handleUpdatedDoc)
      realtime.subscribe('updated', APPS_DOCTYPE, this.handleUpdatedDoc)
      realtime.subscribe('deleted', APPS_DOCTYPE, this.handleDeletedDoc)
    })
  }

  handleUpdatedDoc(doc: CozyDoc): void {
    const doctype: string = doc._type
    if (!doctype) {
      return
    }
    const searchIndex = this.searchIndexes?.[doctype]
    if (!searchIndex) {
      // No index yet: it will be done by querying the local db
      return
    }
    log.debug('[REALTIME] index doc after update : ', doc)
    searchIndex.index.add(doc)
  }

  handleDeletedDoc(doc: CozyDoc): void {
    const doctype: string = doc._type
    if (!doctype) {
      return
    }
    const searchIndex = this.searchIndexes?.[doctype]
    if (!searchIndex) {
      // No index yet: it will be done by querying the local db
      return
    }
    log.debug('[REALTIME] remove doc from index after update : ', doc)
    this.searchIndexes[doctype].index.remove(doc._id)
  }

  startReplicationWithDebounce(
    client: { startReplication: () => void },
    REPLICATION_DEBOUNCE: number
  ) {
    let timeoutId: NodeJS.Timeout | null = null

    return (): void => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        client.startReplication()
      }, REPLICATION_DEBOUNCE)
    }
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
      if (this.shouldIndexDoc(doc)) {
        flexsearchIndex.add(doc)
      }
    }

    return flexsearchIndex
  }

  shouldIndexDoc(doc: CozyDoc): boolean {
    if (isIOCozyFile(doc)) {
      const notInTrash = !doc.trashed && !/^\/\.cozy_trash/.test(doc.path)
      const notRootDir = doc._id !== ROOT_DIR_ID
      // Shared drives folder to be hidden in search.
      // The files inside it though must appear. Thus only the file with the folder ID is filtered out.
      const notSharedDrivesDir = doc._id !== SHARED_DRIVES_DIR_ID

      return notInTrash && notRootDir && notSharedDrivesDir
    }
    return true
  }

  async indexDocsForSearch(doctype: string): Promise<SearchIndex> {
    const searchIndex = this.searchIndexes[doctype]
    const pouchLink = getPouchLink(this.client)

    if (!pouchLink) return null

    if (!searchIndex) {
      // First search indexing
      const docs = await this.client.queryAll(Q(doctype).limitBy(null))
      const index = this.buildSearchIndex(doctype, docs)
      const info = await pouchLink.getDbInfo(doctype)

      this.searchIndexes[doctype] = {
        index,
        lastSeq: info?.update_seq,
        lastUpdated: new Date().toISOString()
      }
      return this.searchIndexes[doctype]
    }

    // Incremental search indexing
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
    searchIndex.lastUpdated = new Date().toISOString()
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
      [FILES_DOCTYPE]: { index: filesIndex, lastSeq: null },
      [CONTACTS_DOCTYPE]: { index: contactsIndex, lastSeq: null },
      [APPS_DOCTYPE]: { index: appsIndex, lastSeq: null }
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
    const sortedResults = this.sortSearchResults(results)

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
      const indexResults = index.index.search(query, {
        limit: LIMIT_DOCTYPE_SEARCH,
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
    return this.sortSearchResults(searchResults)
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
        return a.doc.slug.localeCompare(b.doc.slug)
      } else if (
        a.doctype === CONTACTS_DOCTYPE &&
        isIOCozyContact(a.doc) &&
        isIOCozyContact(b.doc)
      ) {
        return a.doc.displayName.localeCompare(b.doc.displayName)
      } else if (
        a.doctype === FILES_DOCTYPE &&
        isIOCozyFile(a.doc) &&
        isIOCozyFile(b.doc)
      ) {
        if (a.doc.type !== b.doc.type) {
          return a.doc.type === 'directory' ? -1 : 1
        }
        return a.doc.name.localeCompare(b.doc.name)
      }

      return 0
    })
  }
}

export default SearchEngine
