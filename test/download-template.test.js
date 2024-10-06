import { it, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs/promises'
import fss from 'node:fs'
import { fileURLToPath } from 'node:url'
import { downloadTemplate } from '../src/index.js'

// NOTE: Some test may rely on the previous to work. While this isn't the best practice,
// the tests require networking fetching anyways so it's already fragile. And this helps
// with preserving bandwidth fetching templates. The tests that rely on this behaviour
// will have a comment indicating so.

const dumpDir = fileURLToPath(new URL('../test-dump/', import.meta.url))
const cacheDir = path.join(dumpDir, 'cache')
const downloadDir = path.join(dumpDir, 'download')

// Remove dump dir so the tests are deterministic
fss.rmSync(dumpDir, { recursive: true, force: true })

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
    const targetDir = path.join(downloadDir, 'from-github')
    const result = await downloadTemplate('unjs/template', {
      dir: targetDir,
    })

    assert.ok(fss.existsSync(targetDir))
    assert.ok(fss.existsSync(path.join(targetDir, 'README.md')))
    assert.equal(result.info.name, 'unjs-template')
    assert.equal(result.source, 'unjs/template')

    // download again, should error as directory is not empty
    assert.rejects(async () => {
      await downloadTemplate('unjs/template', {
        dir: targetDir,
      })
    })
  })

  for (const provider of ['gitlab', 'bitbucket', 'sourcehut']) {
    it(`downloads a template from ${provider}`, async () => {
      const targetDir = path.join(downloadDir, `from-${provider}`)

      const templateInput =
        provider === 'sourcehut' ? 'pi0/unjs-template' : 'unjs/template'
      const templateName =
        provider === 'sourcehut' ? 'pi0-unjs-template' : 'unjs-template'

      const result = await downloadTemplate(templateInput, {
        provider,
        dir: targetDir,
      })

      assert.ok(fss.existsSync(targetDir))
      assert.ok(fss.existsSync(path.join(targetDir, 'README.md')))
      assert.equal(result.info.name, templateName)
      assert.equal(result.source, templateInput)

      // download again, should error as directory is not empty
      assert.rejects(async () => {
        await downloadTemplate(templateInput, {
          dir: targetDir,
        })
      })
    })
  }

  it('downloads a template in subdir', async () => {
    const targetDir = path.join(downloadDir, 'subdir')
    const result = await downloadTemplate('unjs/template/playground', {
      dir: targetDir,
    })

    assert.ok(fss.existsSync(targetDir))
    assert.ok(fss.existsSync(path.join(targetDir, 'index.ts')))
    assert.equal(result.info.name, 'unjs-template')
    assert.equal(result.source, 'unjs/template/playground')
  })

  // This relies on previous tests already caching unjs/template (github)
  it('offline prefer', async () => {
    const targetDir = path.join(downloadDir, 'offline-prefer')
    const result = await downloadTemplate('unjs/template', {
      dir: targetDir,
      offline: 'prefer',
    })

    assert.ok(fss.existsSync(targetDir))
    assert.ok(fss.existsSync(path.join(targetDir, 'README.md')))
    assert.equal(result.info.name, 'unjs-template')
    assert.equal(result.source, 'unjs/template')
  })

  // This relies on previous tests already caching unjs/template (github)
  it('offline always', async () => {
    const targetDir = path.join(downloadDir, 'offline-always')
    const result = await downloadTemplate('unjs/template', {
      dir: targetDir,
      offline: true,
    })
  })

  it('force clean', async () => {
    const targetDir = path.join(downloadDir, 'offline-always')
    await fs.mkdir(targetDir, { recursive: true })
    await fs.writeFile(path.join(targetDir, 'README.md'), 'test')
    await fs.writeFile(path.join(targetDir, 'blabla.md'), 'test')

    const result = await downloadTemplate('unjs/template', {
      dir: targetDir,
      force: 'clean',
    })
    assert.ok(fss.existsSync(targetDir))
    assert.ok(fss.existsSync(path.join(targetDir, 'README.md')))
    assert.equal(result.info.name, 'unjs-template')
    assert.equal(result.source, 'unjs/template')
    assert.notEqual(fss.readFileSync(path.join(targetDir, 'README.md')), 'test') // overwritten
    assert.ok(!fss.existsSync(path.join(targetDir, 'blabla.md'))) // removed
  })

  it('force true', async () => {
    const targetDir = path.join(downloadDir, 'offline-always')
    await fs.mkdir(targetDir, { recursive: true })
    await fs.writeFile(path.join(targetDir, 'README.md'), 'test')
    await fs.writeFile(path.join(targetDir, 'blabla.md'), 'test')

    const result = await downloadTemplate('unjs/template', {
      dir: targetDir,
      force: true,
    })
    assert.ok(fss.existsSync(targetDir))
    assert.ok(fss.existsSync(path.join(targetDir, 'README.md')))
    assert.equal(result.info.name, 'unjs-template')
    assert.equal(result.source, 'unjs/template')
    assert.notEqual(fss.readFileSync(path.join(targetDir, 'README.md')), 'test') // overwritten
    assert.ok(fss.existsSync(path.join(targetDir, 'blabla.md'))) // preserved
  })
})
