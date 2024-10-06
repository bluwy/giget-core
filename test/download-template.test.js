import { it, describe, before, after } from 'node:test'
import path from 'node:path'
import fs from 'node:fs/promises'
import fss from 'node:fs'
import { fileURLToPath } from 'node:url'
import { downloadTemplate } from '../src/index.js'
import assert from 'node:assert/strict'

const cacheDir = fileURLToPath(new URL('../test-dump/cache/', import.meta.url))
const downloadDir = fileURLToPath(
  new URL('../test-dump/download/', import.meta.url),
)

describe('downloadTemplate', () => {
  let originalXdgCacheHome = process.env.XDG_CACHE_HOME

  before(async () => {
    // Download cache in sibling directory for easy debugging
    process.env.XDG_CACHE_HOME = cacheDir
    await fs.rm(downloadDir, { recursive: true, force: true })
  })

  after(() => {
    process.env.XDG_CACHE_HOME = originalXdgCacheHome
  })

  it('downloads a template', async () => {
    const targetDir = path.join(downloadDir, 'downloads-a-template')
    const result = await downloadTemplate('unjs/template', {
      dir: targetDir,
    })

    assert.ok(fss.existsSync(targetDir))
    assert.ok(fss.existsSync(path.join(targetDir, 'README.md')))
    assert.equal(result.name, 'unjs-template')
    assert.equal(result.source, 'unjs/template')

    // download again, should error as directory is not empty
    assert.rejects(async () => {
      await downloadTemplate('unjs/template', {
        dir: targetDir,
      })
    })
  })

  it('downloads a template in subdir', async () => {
    const targetDir = path.join(downloadDir, 'download-subdir')
    const result = await downloadTemplate('unjs/template/playground', {
      dir: targetDir,
    })

    assert.ok(fss.existsSync(targetDir))
    assert.ok(fss.existsSync(path.join(targetDir, 'index.ts')))
    assert.equal(result.name, 'unjs-template')
    assert.equal(result.source, 'unjs/template/playground')
  })
})
