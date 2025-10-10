import { renderHook } from '@testing-library/react'

import type CozyClient from 'cozy-client'
import flag from 'cozy-flags'

import { DataProxyWorker } from '@/dataproxy/common/DataProxyInterface'

import { useSharedDriveRealtime } from './useSharedDriveRealtime'

jest.mock('cozy-flags')

describe('useSharedDriveRealtime', () => {
  const mockFlag = flag as jest.MockedFunction<typeof flag>

  let mockSubscribe: jest.Mock
  let mockUnsubscribe: jest.Mock
  let mockAddSharedDrive: jest.Mock
  let mockRemoveSharedDrive: jest.Mock

  type RealtimeHandler = (event: unknown) => void

  const getHandler = (event: 'created' | 'deleted'): RealtimeHandler => {
    const calls = mockSubscribe.mock.calls as Array<
      [string, string, RealtimeHandler]
    >
    return calls.find(call => call[0] === event)?.[2] as RealtimeHandler
  }

  const createMockClient = (hasRealtime = true): CozyClient => {
    const client = {
      plugins: hasRealtime
        ? {
            realtime: {
              subscribe: mockSubscribe,
              unsubscribe: mockUnsubscribe
            }
          }
        : {}
    } as unknown as CozyClient
    return client
  }

  const createMockWorker = (): DataProxyWorker => {
    return {
      addSharedDrive: mockAddSharedDrive,
      removeSharedDrive: mockRemoveSharedDrive
    } as unknown as DataProxyWorker
  }

  beforeEach(() => {
    mockSubscribe = jest.fn()
    mockUnsubscribe = jest.fn()
    mockAddSharedDrive = jest.fn()
    mockRemoveSharedDrive = jest.fn()
    mockFlag.mockReturnValue(true)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should not subscribe when client is null', () => {
    renderHook(() => useSharedDriveRealtime(null, createMockWorker()))

    expect(mockSubscribe).not.toHaveBeenCalled()
  })

  it('should not subscribe when feature flag is disabled', () => {
    mockFlag.mockReturnValue(false)

    renderHook(() =>
      useSharedDriveRealtime(createMockClient(), createMockWorker())
    )

    expect(mockSubscribe).not.toHaveBeenCalled()
  })

  it('should throw error when realtime plugin is missing', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    expect(() => {
      renderHook(() =>
        useSharedDriveRealtime(createMockClient(false), createMockWorker())
      )
    }).toThrow('You must include the realtime plugin to use RealTimeQueries')

    consoleErrorSpy.mockRestore()
  })

  it('should subscribe to created and deleted events', () => {
    renderHook(() =>
      useSharedDriveRealtime(createMockClient(), createMockWorker())
    )

    expect(mockSubscribe).toHaveBeenCalledTimes(2)
    expect(mockSubscribe).toHaveBeenCalledWith(
      'created',
      'io.cozy.files',
      expect.any(Function)
    )
    expect(mockSubscribe).toHaveBeenCalledWith(
      'deleted',
      'io.cozy.files',
      expect.any(Function)
    )
  })

  it('should handle file created event for shared drive', () => {
    const mockWorker = createMockWorker()
    renderHook(() => useSharedDriveRealtime(createMockClient(), mockWorker))

    // Get the created event handler
    const createdHandler = getHandler('created')

    expect(createdHandler).toBeDefined()

    // Simulate a shared drive creation event
    const event = {
      dir_id: 'io.cozy.files.shared-drives-dir',
      class: 'shortcut',
      referenced_by: [{ id: 'shared-drive-123' }]
    }

    createdHandler(event)

    expect(mockAddSharedDrive).toHaveBeenCalledWith('shared-drive-123')
  })

  it('should handle file deleted event for shared drive', () => {
    const mockWorker = createMockWorker()
    renderHook(() => useSharedDriveRealtime(createMockClient(), mockWorker))

    // Get the deleted event handler
    const deletedHandler = getHandler('deleted')

    expect(deletedHandler).toBeDefined()

    // Simulate a shared drive deletion event
    const event = {
      dir_id: 'io.cozy.files.shared-drives-dir',
      class: 'shortcut',
      referenced_by: [{ id: 'shared-drive-456' }]
    }

    deletedHandler(event)

    expect(mockRemoveSharedDrive).toHaveBeenCalledWith('shared-drive-456')
  })

  it('should ignore events with wrong dir_id', () => {
    const mockWorker = createMockWorker()
    renderHook(() => useSharedDriveRealtime(createMockClient(), mockWorker))

    const createdHandler = getHandler('created')

    const event = {
      dir_id: 'some-other-dir',
      class: 'shortcut',
      referenced_by: [{ id: 'shared-drive-123' }]
    }

    createdHandler?.(event)

    expect(mockAddSharedDrive).not.toHaveBeenCalled()
  })

  it('should ignore events with invalid event type', () => {
    const mockWorker = createMockWorker()
    renderHook(() => useSharedDriveRealtime(createMockClient(), mockWorker))

    const createdHandler = getHandler('created')

    // Invalid event types
    createdHandler?.(null)
    createdHandler?.(undefined)
    createdHandler?.('string')
    createdHandler?.(123)

    expect(mockAddSharedDrive).not.toHaveBeenCalled()
  })

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() =>
      useSharedDriveRealtime(createMockClient(), createMockWorker())
    )

    // Get the handlers that were subscribed
    const createdHandler = getHandler('created')
    const deletedHandler = getHandler('deleted')

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalledTimes(2)
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'created',
      'io.cozy.files',
      createdHandler
    )
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'deleted',
      'io.cozy.files',
      deletedHandler
    )
  })
})
