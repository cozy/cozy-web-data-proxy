import { IOCozyFile, IOCozyContact, IOCozyApp } from 'cozy-client/types/types'

interface DBRow {
  id: string
  doc: IOCozyFile
}

export interface AllDocsResponse {
  rows: DBRow[]
}

export type AppSlug = string
export type FileClass = 'image' | 'document' | 'audio' | 'video' | 'text' | 'binary' | 'pdf' | 'files' | 'code' | 'slide' | 'spreadsheet' | 'text' | 'zip' | 'shortcut'

export interface NormalizedFile {
  id: string
  /**
   * Always 'file' on cozy-stack response
   */
  type: string
  name: string
  mime: string
  class: FileClass
  path: string
  url: string
  parentUrl: string
  openOn: AppSlug
}

export type CozyDoc = (NormalizedFile | IOCozyContact | IOCozyApp)
