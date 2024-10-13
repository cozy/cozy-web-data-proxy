import { IOCozyFile } from 'cozy-client/types/types'

import { TYPE_DIRECTORY } from '@/search/consts'
import { CozyDoc } from '@/search/types'

/**
 * Normalize file for Front usage in <AutoSuggestion> component inside <BarSearchAutosuggest>
 *
 * To reduce API call, the fetching of Note URL has been delayed
 * inside an onSelect function called only if provided to <BarSearchAutosuggest>
 * see https://github.com/cozy/cozy-drive/pull/2663#discussion_r938671963
 *
 * @param {[IOCozyFile]} folders - all the folders returned by API
 * @param {IOCozyFile} file - file to normalize
 * @returns file with normalized field to be used in AutoSuggestion
 */
export const normalizeFile = (
  folders: IOCozyFile[],
  file: IOCozyFile
): CozyDoc => {
  const isDir = file.type === TYPE_DIRECTORY
  let path = ''
  if (isDir) {
    path = file.path ?? ''
  } else {
    const parentDir = folders.find(folder => folder._id === file.dir_id)
    path = parentDir && parentDir.path ? parentDir.path : ''
  }
  return { ...file, _type: 'io.cozy.files', path }
}
