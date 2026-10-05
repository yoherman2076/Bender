import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const localChrome = join(homedir(), '.local/bin/google-chrome-stable')
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (existsSync(localChrome) ? localChrome : undefined)

export function launchBrowser(options = {}) {
  return chromium.launch({
    ...options,
    ...(executablePath ? { executablePath } : {}),
  })
}
