// @ts-expect-error: TS doesn't know about the global Bun.
import { it, describe, beforeEach, afterEach } from 'bun:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs/promises'
import fss from 'node:fs'
import { fileURLToPath } from 'node:url'
import { downloadTemplate } from '../src/download-template.js'

// NOTE: This test for Bun on windows.

const dumpDir = fileURLToPath(new URL('../test-dump/', import.meta.url))
const cacheDir = path.join(dumpDir, 'cache')
const downloadDir = path.join(dumpDir, 'download')

// Remove dump dir so the tests are deterministic
fss.rmSync(dumpDir, { recursive: true, force: true })

describe('downloadTemplate', () => {
  let originalXdgCacheHome = process.env.XDG_CACHE_HOME

  beforeEach(async () => {
    // Download cache in sibling directory for easy debugging
    process.env.XDG_CACHE_HOME = cacheDir
    await fs.rm(downloadDir, { recursive: true, force: true })
  })

  afterEach(() => {
    process.env.XDG_CACHE_HOME = originalXdgCacheHome
  })

  it('downloads a template', async () => {
    const targetDir = path.join(downloadDir, 'from-github')
    await downloadTemplate('unjs/template', {
      dir: targetDir,
    })

    assert.ok(fss.existsSync(targetDir))
    assert.ok(fss.existsSync(path.join(targetDir, 'README.md')))
  })
})
