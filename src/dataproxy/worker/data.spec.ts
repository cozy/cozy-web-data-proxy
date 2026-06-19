import type CozyClient from 'cozy-client'

import type { ClientData } from '@/dataproxy/common/DataProxyInterface'
import {
  findSharedDriveDrift,
  queryIsTrustedDevice,
  queryRecents,
  queryRecentsHandlingStaleDrives
} from '@/dataproxy/worker/data'
import { getPouchLink } from '@/helpers/client'

jest.mock('@/helpers/client')
const mockedGetPouchLink = getPouchLink as jest.MockedFunction<
  typeof getPouchLink
>

const make403 = (): Error =>
  Object.assign(new Error('Forbidden'), { status: 403 })

const setupPouchLink = (requestQuery: jest.Mock): CozyClient => {
  mockedGetPouchLink.mockReturnValue({
    doctypes: [
      'io.cozy.files',
      'io.cozy.files.shareddrives-active',
      'io.cozy.files.shareddrives-revoked'
    ],
    pouches: {
      waitForCurrentReplications: jest.fn().mockResolvedValue(undefined)
    }
  } as unknown as ReturnType<typeof getPouchLink>)
  return { requestQuery } as unknown as CozyClient
}

const makeClient = (attributes: Record<string, unknown>): CozyClient =>
  ({
    getStackClient: () => ({
      fetchJSON: (): Promise<unknown> =>
        Promise.resolve({ data: { attributes } })
    })
  }) as unknown as CozyClient

const makeClientData = (over: Partial<ClientData> = {}): ClientData =>
  ({
    uri: 'https://alice.localhost',
    token: 'token',
    instanceOptions: { flags: {} },
    capabilities: {},
    useRemoteData: false,
    ...over
  }) as unknown as ClientData

describe('queryIsTrustedDevice', () => {
  it('trusts a long-running session', async () => {
    const trusted = await queryIsTrustedDevice(
      makeClient({ long_run: true }),
      makeClientData()
    )
    expect(trusted).toBe(true)
  })

  it('does not trust a short session on a password instance', async () => {
    const trusted = await queryIsTrustedDevice(
      makeClient({ long_run: false }),
      makeClientData()
    )
    expect(trusted).toBe(false)
  })

  it('trusts a short session on an OIDC instance', async () => {
    const trusted = await queryIsTrustedDevice(
      makeClient({ long_run: false }),
      makeClientData({ capabilities: { can_auth_with_oidc: true } })
    )
    expect(trusted).toBe(true)
  })

  it('trusts when the stack does not report long_run', async () => {
    const trusted = await queryIsTrustedDevice(makeClient({}), makeClientData())
    expect(trusted).toBe(true)
  })

  it('trusts when the force-trusted-device flag is set', async () => {
    const trusted = await queryIsTrustedDevice(
      makeClient({ long_run: false }),
      makeClientData({
        instanceOptions: {
          flags: { 'dataproxy.force-trusted-device.enabled': true }
        }
      } as unknown as Partial<ClientData>)
    )
    expect(trusted).toBe(true)
  })
})

describe('queryRecents', () => {
  it('returns the recents of every doctype it could query', async () => {
    const requestQuery = jest.fn((definition: { doctype: string }) =>
      Promise.resolve({
        data: [{ _id: definition.doctype, updated_at: '2026-01-01T00:00:00Z' }]
      })
    )

    const { recents, staleDriveIds } = await queryRecents(
      setupPouchLink(requestQuery)
    )

    expect(recents).toHaveLength(3)
    expect(staleDriveIds).toEqual([])
  })

  it('reports a shared drive the stack rejects with a 403 as stale and keeps the rest', async () => {
    const requestQuery = jest.fn((definition: { doctype: string }) =>
      definition.doctype === 'io.cozy.files.shareddrives-revoked'
        ? Promise.reject(make403())
        : Promise.resolve({
            data: [{ _id: definition.doctype, updated_at: '2026-01-01' }]
          })
    )

    const { recents, staleDriveIds } = await queryRecents(
      setupPouchLink(requestQuery)
    )

    expect(staleDriveIds).toEqual(['revoked'])
    expect(recents).toHaveLength(2)
  })

  it('rejects when the main files doctype answers 403', async () => {
    const requestQuery = jest.fn((definition: { doctype: string }) =>
      definition.doctype === 'io.cozy.files'
        ? Promise.reject(make403())
        : Promise.resolve({ data: [] })
    )

    await expect(
      queryRecents(setupPouchLink(requestQuery))
    ).rejects.toMatchObject({ status: 403 })
  })

  it('rejects when a shared drive fails with a non-403 error', async () => {
    const requestQuery = jest.fn((definition: { doctype: string }) =>
      definition.doctype === 'io.cozy.files.shareddrives-revoked'
        ? Promise.reject(new Error('Boom'))
        : Promise.resolve({ data: [] })
    )

    await expect(queryRecents(setupPouchLink(requestQuery))).rejects.toThrow(
      'Boom'
    )
  })
})

describe('findSharedDriveDrift', () => {
  const setup = (doctypes: string[], accessibleIds: string[]): CozyClient => {
    mockedGetPouchLink.mockReturnValue({
      doctypes
    } as unknown as ReturnType<typeof getPouchLink>)
    return {
      collection: () => ({
        fetchSharedDrives: (): Promise<unknown> =>
          Promise.resolve({ data: accessibleIds.map(id => ({ _id: id })) })
      })
    } as unknown as CozyClient
  }

  it('reports drives indexed locally but missing from the stack as stale', async () => {
    const client = setup(
      [
        'io.cozy.files',
        'io.cozy.files.shareddrives-active',
        'io.cozy.files.shareddrives-revoked'
      ],
      ['active']
    )
    expect(await findSharedDriveDrift(client)).toEqual({
      staleDriveIds: ['revoked'],
      missingDriveIds: []
    })
  })

  it('reports drives present on the stack but not indexed locally as missing', async () => {
    const client = setup(
      ['io.cozy.files', 'io.cozy.files.shareddrives-active'],
      ['active', 'fresh']
    )
    expect(await findSharedDriveDrift(client)).toEqual({
      staleDriveIds: [],
      missingDriveIds: ['fresh']
    })
  })

  it('reports nothing when local drives and the stack agree', async () => {
    const client = setup(
      ['io.cozy.files', 'io.cozy.files.shareddrives-active'],
      ['active']
    )
    expect(await findSharedDriveDrift(client)).toEqual({
      staleDriveIds: [],
      missingDriveIds: []
    })
  })

  it('returns empty drift when there is no pouch link', async () => {
    mockedGetPouchLink.mockReturnValue(
      undefined as unknown as ReturnType<typeof getPouchLink>
    )
    const fetchSharedDrives = jest.fn()
    const client = {
      collection: () => ({ fetchSharedDrives })
    } as unknown as CozyClient

    expect(await findSharedDriveDrift(client)).toEqual({
      staleDriveIds: [],
      missingDriveIds: []
    })
    expect(fetchSharedDrives).not.toHaveBeenCalled()
  })
})

describe('queryRecentsHandlingStaleDrives', () => {
  const REVOKED = 'io.cozy.files.shareddrives-revoked'

  const makeClient = (
    requestQuery: jest.Mock,
    fetchSharedDrives: jest.Mock
  ): CozyClient => {
    mockedGetPouchLink.mockReturnValue({
      doctypes: ['io.cozy.files', 'io.cozy.files.shareddrives-active', REVOKED],
      pouches: {
        waitForCurrentReplications: jest.fn().mockResolvedValue(undefined)
      }
    } as unknown as ReturnType<typeof getPouchLink>)
    return {
      requestQuery,
      collection: () => ({ fetchSharedDrives })
    } as unknown as CozyClient
  }

  const resolveExcept = (failing: string, error: Error): jest.Mock =>
    jest.fn((definition: { doctype: string }) =>
      definition.doctype === failing
        ? Promise.reject(error)
        : Promise.resolve({
            data: [{ _id: definition.doctype, updated_at: '2026-01-01' }]
          })
    )

  it('drops the index of a drive the stack rejected with a 403', async () => {
    const requestQuery = resolveExcept(REVOKED, make403())
    const fetchSharedDrives = jest
      .fn()
      .mockResolvedValue({ data: [{ _id: 'active' }] })
    const onStale = jest.fn().mockResolvedValue(undefined)
    const onMissing = jest.fn().mockResolvedValue(undefined)

    const recents = await queryRecentsHandlingStaleDrives(
      makeClient(requestQuery, fetchSharedDrives),
      onStale,
      onMissing
    )

    expect(onStale).toHaveBeenCalledWith(['revoked'])
    expect(onMissing).not.toHaveBeenCalled()
    expect(recents).toHaveLength(2)
  })

  it('does not re-sync a drive it just dropped, even when the stack still lists it', async () => {
    // Mirror production: the doctypes the link exposes shrink as drives are
    // removed, so the drift lookup runs against the post-removal state.
    const doctypes = [
      'io.cozy.files',
      'io.cozy.files.shareddrives-active',
      REVOKED
    ]
    mockedGetPouchLink.mockReturnValue({
      doctypes,
      pouches: {
        waitForCurrentReplications: jest.fn().mockResolvedValue(undefined)
      }
    } as unknown as ReturnType<typeof getPouchLink>)

    const requestQuery = resolveExcept(REVOKED, make403())
    // The stack still reports the revoked drive as accessible: only its local
    // index is invalid, not its membership.
    const fetchSharedDrives = jest
      .fn()
      .mockResolvedValue({ data: [{ _id: 'active' }, { _id: 'revoked' }] })
    const onStale = jest.fn((ids: string[]) => {
      for (const id of ids) {
        const index = doctypes.indexOf(`io.cozy.files.shareddrives-${id}`)
        if (index !== -1) {
          doctypes.splice(index, 1)
        }
      }
      return Promise.resolve()
    })
    const onMissing = jest.fn().mockResolvedValue(undefined)

    const recents = await queryRecentsHandlingStaleDrives(
      {
        requestQuery,
        collection: () => ({ fetchSharedDrives })
      } as unknown as CozyClient,
      onStale,
      onMissing
    )

    expect(onStale).toHaveBeenCalledWith(['revoked'])
    expect(onMissing).not.toHaveBeenCalled()
    expect(recents).toHaveLength(2)
  })

  it('syncs a drive present on the stack but missing locally', async () => {
    const requestQuery = resolveExcept(REVOKED, make403())
    const fetchSharedDrives = jest
      .fn()
      .mockResolvedValue({ data: [{ _id: 'active' }, { _id: 'fresh' }] })
    const onStale = jest.fn().mockResolvedValue(undefined)
    const onMissing = jest.fn().mockResolvedValue(undefined)

    await queryRecentsHandlingStaleDrives(
      makeClient(requestQuery, fetchSharedDrives),
      onStale,
      onMissing
    )

    expect(onMissing).toHaveBeenCalledWith(['fresh'])
    expect(onStale).toHaveBeenCalledWith(['revoked'])
  })

  it('still returns recents when the missing-drive sync fails', async () => {
    const requestQuery = resolveExcept(REVOKED, make403())
    const fetchSharedDrives = jest
      .fn()
      .mockRejectedValue(new Error('sharings unavailable'))
    const onStale = jest.fn().mockResolvedValue(undefined)
    const onMissing = jest.fn().mockResolvedValue(undefined)

    const recents = await queryRecentsHandlingStaleDrives(
      makeClient(requestQuery, fetchSharedDrives),
      onStale,
      onMissing
    )

    expect(onStale).toHaveBeenCalledWith(['revoked'])
    expect(onMissing).not.toHaveBeenCalled()
    expect(recents).toHaveLength(2)
  })

  it('does not reconcile when the recents query succeeds', async () => {
    const requestQuery = jest.fn(() => Promise.resolve({ data: [] }))
    const fetchSharedDrives = jest.fn()
    const onStale = jest.fn()
    const onMissing = jest.fn()

    await queryRecentsHandlingStaleDrives(
      makeClient(requestQuery, fetchSharedDrives),
      onStale,
      onMissing
    )

    expect(fetchSharedDrives).not.toHaveBeenCalled()
    expect(onStale).not.toHaveBeenCalled()
    expect(onMissing).not.toHaveBeenCalled()
  })

  it('rethrows a non-403 failure without touching shared drives', async () => {
    const requestQuery = resolveExcept(REVOKED, new Error('Boom'))
    const fetchSharedDrives = jest.fn()
    const onStale = jest.fn()
    const onMissing = jest.fn()

    await expect(
      queryRecentsHandlingStaleDrives(
        makeClient(requestQuery, fetchSharedDrives),
        onStale,
        onMissing
      )
    ).rejects.toThrow('Boom')
    expect(fetchSharedDrives).not.toHaveBeenCalled()
    expect(onStale).not.toHaveBeenCalled()
    expect(onMissing).not.toHaveBeenCalled()
  })
})
