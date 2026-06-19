import type CozyClient from 'cozy-client'

import type { ClientData } from '@/dataproxy/common/DataProxyInterface'
import { queryIsTrustedDevice } from '@/dataproxy/worker/data'

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
