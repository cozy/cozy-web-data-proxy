//import { Document } from 'flexsearch'
import Document from 'flexsearch/dist/module/document.js'
import { queryFilesForSearch, queryAllContacts, queryAllApps } from 'src/queries'
import CozyClient from 'cozy-client'
import { CozyDocs } from 'src/common/DataProxyInterface'
import { encode } from "flexsearch/dist/module/lang/latin/balance.js";


export const initIndexes = async (client: CozyClient) => {
  console.log('lets init indexes');

  const files = await queryFilesForSearch(client)
  console.log('files : ', files);
  const filesIndex = indexDocs(files)
  
  const contacts = await queryAllContacts(client)
  const contactsIndex = indexDocs(contacts)
  const apps = await queryAllApps(client)
  const appsIndex = indexDocs(apps)

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


  return [filesIndex, contactsIndex, appsIndex]
}

export const searchOnIndexes = (query, indexes) => {
  let res: any = []
  for (const index of indexes){ 
    const results = index.search(query, 10, { enrich: true})
    res = res.concat(results)
  }
  return res
}


const indexDocs = (docs: CozyDocs) => {
  const flexsearchIndex = new Document({
    tokenize: 'forward',
    encode,
    store: true,
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
