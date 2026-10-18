import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// Pages load on first use; on a busy machine the first one can take over the default 1s.
configure({ asyncUtilTimeout: 3000 })

// jsdom lays nothing out, so it has no scrolling; browsers all have this.
Element.prototype.scrollIntoView ??= () => {}

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})
