export const isRealtimeMessage = (data: unknown): boolean =>
  typeof data === 'object' &&
  data !== null &&
  (data as { kind?: unknown }).kind === 'realtime'
