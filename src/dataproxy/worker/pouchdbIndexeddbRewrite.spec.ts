/**
 * Regression test for the pouchdb-adapter-indexeddb patch
 * (patches/pouchdb-adapter-indexeddb+9.0.0.patch).
 *
 * The unpatched adapter decides whether to escape field names at write time
 * with a needsRewrite() check that stops at the first nested-object field.
 * Shared-drive documents arrive from the stack proxy with alphabetical key
 * order, so the first nested object is cozyMetadata (camelCase only), the
 * check bails out, documents are stored unescaped, and the Mango indexes
 * (which always use escaped key paths) match nothing: indexed queries like
 * recents silently return 0 rows. Fixed upstream by pouchdb/pouchdb#9020 and
 * #9019, both unreleased as of pouchdb 9.0.0.
 */
import 'fake-indexeddb/auto'
import PouchDBAdapterIndexeddb from 'pouchdb-adapter-indexeddb'
import PouchDB from 'pouchdb-browser'
import PouchDBFind from 'pouchdb-find'

// jsdom does not expose structuredClone, which fake-indexeddb relies on
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T
}

PouchDB.plugin(PouchDBFind)
PouchDB.plugin(PouchDBAdapterIndexeddb)

// Key order matters: this mirrors the alphabetical order served by the
// shared-drive _changes proxy, where cozyMetadata is the first nested object.
const makeFileDoc = (
  id: string,
  updatedAt: string
): Record<string, unknown> => ({
  _id: id,
  _rev: '1-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  class: 'text',
  cozyMetadata: { createdAt: updatedAt, doctypeVersion: '1' },
  created_at: updatedAt,
  dir_id: 'root',
  name: `${id}.txt`,
  trashed: false,
  type: 'file',
  updated_at: updatedAt
})

describe('patched pouchdb-adapter-indexeddb', () => {
  let db: PouchDB.Database

  beforeEach(() => {
    db = new PouchDB(`rewrite-test-${Date.now()}-${Math.random()}`, {
      adapter: 'indexeddb'
    })
  })

  afterEach(async () => {
    await db.destroy()
  })

  it('indexes documents replicated with alphabetical key order', async () => {
    await db.bulkDocs(
      [
        makeFileDoc('file1', '2026-06-09T11:20:37+02:00'),
        makeFileDoc('file2', '2026-06-09T12:20:37+02:00')
      ],
      { new_edits: false }
    )

    await db.createIndex({
      index: {
        fields: ['updated_at', 'type', 'trashed', 'dir_id'],
        ddoc: 'by_updated_at_and_type_and_trashed_and_dir_id'
      }
    })

    // Without the patch this returns 0 rows because the index materializes
    // empty for unescaped documents. (The real recents query uses a $gt range,
    // which fake-indexeddb cannot express, so query an exact value instead:
    // both go through the same index.)
    const result = await db.find({
      selector: { updated_at: '2026-06-09T12:20:37+02:00' },
      use_index: 'by_updated_at_and_type_and_trashed_and_dir_id'
    })

    expect(result.docs.map(d => d._id)).toEqual(['file2'])

    // The native IndexedDB index must contain every live document; with the
    // unpatched adapter it contains none because its key path uses escaped
    // field names while the records were stored unescaped.
    const indexEntries = await new Promise<number>((resolve, reject) => {
      const request = indexedDB.open(`_pouch_${db.name}`)
      request.onerror = (): void => reject(request.error)
      request.onsuccess = (): void => {
        const idb = request.result
        const store = idb.transaction('docs', 'readonly').objectStore('docs')
        const indexName = [...store.indexNames].find(name =>
          name.startsWith('_find_idx/')
        )
        if (!indexName) {
          idb.close()
          return reject(new Error('no native find index created'))
        }
        const count = store.index(indexName).count()
        count.onsuccess = (): void => {
          idb.close()
          resolve(count.result)
        }
        count.onerror = (): void => reject(count.error)
      }
    })

    expect(indexEntries).toBe(2)
  })

  it('keeps nested objects intact when rewriting', async () => {
    await db.bulkDocs([makeFileDoc('file1', '2026-06-09T11:20:37+02:00')], {
      new_edits: false
    })

    // Without the companion fix, clean nested objects come back as `false`.
    const doc = await db.get<Record<string, unknown>>('file1')
    expect(doc.cozyMetadata).toEqual({
      createdAt: '2026-06-09T11:20:37+02:00',
      doctypeVersion: '1'
    })
    expect(doc.trashed).toBe(false)
  })
})
