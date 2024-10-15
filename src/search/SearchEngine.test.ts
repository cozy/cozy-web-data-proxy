import SearchEngine from './SearchEngine'

jest.mock('cozy-client')
jest.mock('flexsearch')
jest.mock('flexsearch/dist/module/lang/latin/balance')

jest.mock('@/search/helpers/client', () => ({
  getPouchLink: jest.fn()
}))
jest.mock('@/search/helpers/getSearchEncoder', () => ({
  getSearchEncoder: jest.fn()
}))

describe('SearchEngine.debouncedReplication', () => {
  let searchEngine: SearchEngine
  let mockClient: { startReplication: jest.Mock }

  beforeEach(() => {
    jest.useFakeTimers() // Use fake timers to control the timing in tests
    mockClient = {
      startReplication: jest.fn(), // Mock the client method
      on: jest.fn()
    }
    searchEngine = new SearchEngine(mockClient, 3000) // 3 second debounce time
  })

  afterEach(() => {
    jest.clearAllTimers() // Clear all timers after each test
    jest.useRealTimers() // Reset timers to real after the test suite
  })

  test('should debounce the startReplication method', () => {
    searchEngine.debouncedReplication() // Call the method

    // Fast-forward time to less than debounce time and ensure startReplication is not called
    jest.advanceTimersByTime(2000)
    expect(mockClient.startReplication).not.toHaveBeenCalled()

    // Fast-forward past the debounce time
    jest.advanceTimersByTime(1000)
    expect(mockClient.startReplication).toHaveBeenCalledTimes(1)
  })

  test('should reset the debounce timer if debouncedReplication is called again', () => {
    searchEngine.debouncedReplication()
    jest.advanceTimersByTime(2000) // Advance time but less than the debounce time
    searchEngine.debouncedReplication() // Call again before the time is up

    // The timer should reset, so `startReplication` should not have been called yet
    jest.advanceTimersByTime(2000)
    expect(mockClient.startReplication).not.toHaveBeenCalled()

    // Fast-forward past the debounce time
    jest.advanceTimersByTime(1000)
    expect(mockClient.startReplication).toHaveBeenCalledTimes(1)
  })

  test('should only call startReplication once even if called multiple times rapidly', () => {
    searchEngine.debouncedReplication()
    searchEngine.debouncedReplication()
    searchEngine.debouncedReplication()

    // Fast-forward the debounce time
    jest.advanceTimersByTime(3000)

    expect(mockClient.startReplication).toHaveBeenCalledTimes(1)
  })
})
