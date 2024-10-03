let ports = []
let latest_state = {
  count: 0
}

// eslint-disable-next-line no-console
console.log('WORKER SCRIPT')

// Post message to all connected ports
const postMessageAll = (msg, excluded_port = null) => {
  ports.forEach(port => {
    // Don't post message to the excluded port, if one has been specified
    if (port == excluded_port) {
      return
    }
    port.postMessage(msg)
  })
}

onconnect = e => {
  // eslint-disable-next-line no-console
  console.log('WORKER INIT', e)
  const port = e.ports[0]
  ports.push(port)
  port.start()

  port.onmessage = e => {
    // eslint-disable-next-line no-console
    console.log('WORKER RECEIVED', e)
    latest_state.count++
    postMessageAll('RESULT FROM WORKER' + latest_state.count)
  }
}
