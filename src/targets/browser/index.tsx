import React from 'react'
import ReactDOM from 'react-dom/client'

import App from '@/App'

const rootEl = document.querySelector('[role="application"]')
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
