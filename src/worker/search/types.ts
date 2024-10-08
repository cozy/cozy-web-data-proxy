import { IOCozyFile, IOCozyContact, IOCozyApp } from 'cozy-client/types/types'

import { APPS_DOCTYPE, CONTACTS_DOCTYPE, FILES_DOCTYPE } from 'src/consts'

interface DBRow {
  id: string
  doc: IOCozyFile
}

export interface AllDocsResponse {
  rows: DBRow[]
}

export type AppSlug = string
export type FileClass = 'image' | 'document' | 'audio' | 'video' | 'text' | 'binary' | 'pdf' | 'files' | 'code' | 'slide' | 'spreadsheet' | 'text' | 'zip' | 'shortcut'

export type CozyDoc = (IOCozyFile | IOCozyContact | IOCozyApp)

export const isIOCozyFile = (doc: CozyDoc): doc is IOCozyFile => {
  return doc._type === FILES_DOCTYPE
}

export const isIOCozyContact = (doc: CozyDoc): doc is IOCozyContact => {
  return doc._type === CONTACTS_DOCTYPE
}

export const isIOCozyApp = (doc: CozyDoc): doc is IOCozyApp => {
  return doc._type === APPS_DOCTYPE
}
