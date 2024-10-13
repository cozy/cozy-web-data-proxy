export class TabCountSync {
  bc: BroadcastChannel
  count = 0
  subscriptions: Set<Function>
  closed: boolean = false

  constructor() {
    this.bc = new BroadcastChannel('tabcount-sync')
    this.bc.postMessage('opened')
    this.bc.onmessage = (ev: MessageEvent): void => this.onMessage(ev)

    this.count = 1
    this.subscriptions = new Set()
  }

  subscribe(callback: Function) {
    this.subscriptions.add(callback)
    callback(this.count)
    return (): boolean => this.subscriptions.delete(callback)
  }

  setCount(count: number, sync = true): void {
    this.count = count
    this.subscriptions.forEach(fn => {
      fn(count)
    })
    if (sync) {
      this.bc.postMessage(this.count)
    }
  }

  close(): void {
    if (!this.closed) {
      this.bc.postMessage('closed')
      this.bc.close()
      this.closed = true
    }
  }

  onMessage({ data }: { data: string | number }): void {
    if (this.closed) {
      return
    }

    if (data === 'opened') {
      this.setCount(this.count + 1)
    } else if (data === 'closed') {
      this.setCount(this.count - 1)
    } else if (typeof data === 'number') {
      if (this.count > data) {
        this.bc.postMessage(this.count)
      } else if (this.count !== data) {
        this.setCount(data, false)
      }
    }
  }
}
