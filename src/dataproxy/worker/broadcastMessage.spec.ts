import { isRealtimeMessage } from '@/dataproxy/worker/broadcastMessage'

describe('isRealtimeMessage', () => {
  it('is true for a realtime-kind message', () => {
    expect(isRealtimeMessage({ kind: 'realtime', event: 'updated' })).toBe(true)
  })

  it('is false for a worker-state message', () => {
    expect(isRealtimeMessage({ status: 'Ready' })).toBe(false)
  })

  it('is false for non-objects', () => {
    expect(isRealtimeMessage(undefined)).toBe(false)
    expect(isRealtimeMessage('realtime')).toBe(false)
  })
})
