import FlexSearch from 'flexsearch'

import CozyClient from 'cozy-client'
import Minilog from 'cozy-minilog'

import {
  APPS_DOCTYPE,
  FILES_DOCTYPE,
  CONTACTS_DOCTYPE,
  DOCTYPE_ORDER,
  LIMIT_DOCTYPE_SEARCH
} from '@/search/consts'
import { normalizeSearchResult } from '@/search/helpers/normalizeSearchResult'
import {
  CozyDoc,
  RawSearchResult,
  isIOCozyApp,
  isIOCozyContact,
  isIOCozyFile,
  SearchedDoctype,
  SearchIndex,
  SearchResult
} from '@/search/types'

const log = Minilog('🗂️ [Indexing]')

export const search = (
  query: string,
  indexes: SearchIndex[],
  client: CozyClient
): SearchResult[] => {
  log.debug('[SEARCH] indexes : ', indexes)

  const allResults = searchOnIndexes(query, indexes)
  log.debug('[SEARCH] results : ', allResults)
  const results = deduplicateAndFlatten(allResults)
  log.debug('[SEARCH] dedup : ', results)
  const sortedResults = sortAndLimitSearchResults(results)
  log.debug('[SEARCH] sort : ', sortedResults)

  return sortedResults.map(res => normalizeSearchResult(client, res, query))
}

interface FlexSearchResultWithDoctype
  extends FlexSearch.EnrichedDocumentSearchResultSetUnit<CozyDoc> {
  doctype: SearchedDoctype
}

const searchOnIndexes = (
  query: string,
  indexes: SearchIndex[]
): FlexSearchResultWithDoctype[] => {
  log.debug('Searching on indexes')
  let searchResults: FlexSearchResultWithDoctype[] = []
  for (const index of indexes) {
    // FIXME: The given limit seems ignored?
    const indexResults = index.index.search(query, LIMIT_DOCTYPE_SEARCH, {
      enrich: true
    })
    const newResults = indexResults.map(res => ({
      ...res,
      doctype: index.doctype
    }))
    searchResults = searchResults.concat(newResults)
  }
  log.debug('Finished seaching on indexes')
  return searchResults
}

const deduplicateAndFlatten = (
  searchResults: FlexSearchResultWithDoctype[]
): RawSearchResult[] => {
  const combinedResults = searchResults.flatMap(item =>
    item.result.map(r => ({ ...r, field: item.field, doctype: item.doctype }))
  )

  type MapItem = Omit<(typeof combinedResults)[number], 'field'> & {
    fields: string[]
  }
  const resultMap = new Map<FlexSearch.Id[], MapItem>()

  combinedResults.forEach(({ id, field, ...rest }) => {
    if (resultMap.has(id)) {
      // @ts-expect-error TODO
      resultMap.get(id).fields.push(field)
    } else {
      resultMap.set(id, { id, fields: [field], ...rest })
    }
  })

  return [...resultMap.values()]
}

const sortAndLimitSearchResults = (
  searchResults: RawSearchResult[]
): RawSearchResult[] => {
  const sortedResults = sortSearchResults(searchResults)
  return limitSearchResults(sortedResults)
}

const sortSearchResults = (
  searchResults: RawSearchResult[]
): RawSearchResult[] => {
  return searchResults.sort((a, b) => {
    // First, sort by doctype order
    const doctypeComparison =
      DOCTYPE_ORDER[a.doctype] - DOCTYPE_ORDER[b.doctype]
    if (doctypeComparison !== 0) return doctypeComparison

    // Then, sort within each doctype by the specified field
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

const limitSearchResults = (
  searchResults: RawSearchResult[]
): RawSearchResult[] => {
  const limitedResults: {
    [id in SearchedDoctype]: RawSearchResult[]
  } = {
    [APPS_DOCTYPE]: [],
    [CONTACTS_DOCTYPE]: [],
    [FILES_DOCTYPE]: []
  }
  // Limit the results, grouped by doctype
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
