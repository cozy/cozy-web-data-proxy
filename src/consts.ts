export const SEARCH_SCHEMA = {
  "io.cozy.files": [
    "name",
    "path"
  ],
  "io.cozy.contacts": [
    "fullname",
    "company",
    "jobTitle",
    "birthday",
    "email[]:address",
    "address[]:formattedAddress",
    "phone[]:number",
    "cozy[]:url"
  ],
  "io.cozy.apps": [
    "slug",
    "name"
  ]
}

export const FILES_DOCTYPE = 'io.cozy.files'
export const CONTACTS_DOCTYPE = 'io.cozy.contacts'
export const APPS_DOCTYPE = 'io.cozy.apps'

export const TYPE_DIRECTORY = 'directory'
export const ROOT_DIR_ID = 'io.cozy.files.root-dir'
export const TRASH_DIR_ID = 'io.cozy.files.trash-dir'
export const SHARED_DRIVES_DIR_ID = 'io.cozy.files.shared-drives-dir' 
