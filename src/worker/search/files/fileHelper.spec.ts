import CozyClient from 'cozy-client'
import type { IOCozyFile } from 'cozy-client/types/types'

import { makeNormalizedFile } from './fileHelper'

describe('normalizeFile', () => {
  const client = {
    getInstanceOptions: jest.fn().mockReturnValue({
      subdomain: 'nested'
    }),
    getStackClient: jest.fn().mockReturnValue({
      uri: 'https://claude.mycozy.cloud'
    })
  } as unknown as CozyClient
  
  it('Test', () => {
    const file: IOCozyFile = {
      "id": "io.cozy.files.shared-with-me-dir",
      "_id": "io.cozy.files.shared-with-me-dir",
      "type": "directory",
      "name": "Inbox of sharings",
      "dir_id": "io.cozy.files.root-dir",
      "path": "/Inbox of sharings"
    } as unknown as IOCozyFile

    const result = makeNormalizedFile(client, folders, file)
    expect(result).toStrictEqual({
      
    })
  })
  it('Test2', () => {
    const file: IOCozyFile = {
      "id": "fc43a2f786ca5f7895bc60d30b04138c",
      "_id": "fc43a2f786ca5f7895bc60d30b04138c",
      "type": "directory",
      "name": "Settings",
      "dir_id": "io.cozy.files.root-dir",
      "path": "/Settings"
    } as unknown as IOCozyFile

    const result = makeNormalizedFile(client, folders, file)
    expect(result).toStrictEqual({
      
    })
  })
})

const folders = [
  {
      "id": "SOME_FOLDER_ID_1",
      "_id": "SOME_FOLDER_ID_1",
      "type": "directory",
      "name": "TestQualif",
      "dir_id": "io.cozy.files.shared-with-me-dir",
      "path": "/Inbox of sharings/TestQualif"
  },
  {
      "id": "SOME_FOLDER_ID_2",
      "_id": "SOME_FOLDER_ID_2",
      "type": "directory",
      "name": "Settings",
      "dir_id": "io.cozy.files.root-dir",
      "path": "/Settings"
  },
  {
      "id": "SOME_FOLDER_ID_3",
      "_id": "SOME_FOLDER_ID_3",
      "type": "directory",
      "name": "Home",
      "dir_id": "SOME_FOLDER_ID_2",
      "path": "/Settings/Home"
  },
  {
      "id": "io.cozy.files.root-dir",
      "_id": "io.cozy.files.root-dir",
      "type": "directory",
      "path": "/"
  },
  {
      "id": "io.cozy.files.shared-with-me-dir",
      "_id": "io.cozy.files.shared-with-me-dir",
      "type": "directory",
      "name": "Inbox of sharings",
      "dir_id": "io.cozy.files.root-dir",
      "path": "/Inbox of sharings"
  },
  {
      "id": "io.cozy.files.trash-dir",
      "_id": "io.cozy.files.trash-dir",
      "type": "directory",
      "name": ".cozy_trash",
      "dir_id": "io.cozy.files.root-dir",
      "path": "/.cozy_trash"
  }
] as unknown as IOCozyFile[]