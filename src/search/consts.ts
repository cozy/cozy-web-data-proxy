// Attribute order matters to apply priority on matching results
export const SEARCH_SCHEMA = {
  'io.cozy.files': ['name', 'path'],
  'io.cozy.contacts': [
    'displayName',
    'fullname',
    'email[]:address',
    'address[]:formattedAddress',
    'phone[]:number',
    'cozy[]:url',
    'birthday',
    'company',
    'jobTitle'
  ],
  'io.cozy.apps': ['slug', 'name']
}

export const REPLICATION_INTERVAL = 60 * 60 * 1000 // 1h

export const FILES_DOCTYPE = 'io.cozy.files'
export const CONTACTS_DOCTYPE = 'io.cozy.contacts'
export const APPS_DOCTYPE = 'io.cozy.apps'

export const TYPE_DIRECTORY = 'directory'
export const ROOT_DIR_ID = 'io.cozy.files.root-dir'
export const TRASH_DIR_ID = 'io.cozy.files.trash-dir'
export const SHARED_DRIVES_DIR_ID = 'io.cozy.files.shared-drives-dir'

export const LIMIT_DOCTYPE_SEARCH = 100
export const DOCTYPE_ORDER = {
  [APPS_DOCTYPE]: 0,
  [CONTACTS_DOCTYPE]: 1,
  [FILES_DOCTYPE]: 2
}
