import { it, describe } from 'node:test'
import assert from 'node:assert/strict'
import { verifyTemplate } from '../src/index.js'

describe('verifyTemplate', () => {
  it('works', async () => {
    assert.ok(await verifyTemplate('unjs/template'))
    assert.ok(await verifyTemplate('gh:unjs/template'))
    assert.ok(await verifyTemplate('gitlab:unjs/template'))
    assert.ok(await verifyTemplate('bitbucket:unjs/template'))
    // prettier-ignore
    assert.ok(await verifyTemplate('https://api.github.com/repos/unjs/template/tarball/main'))

    // prettier-ignore
    assert.equal(await verifyTemplate('bluwy/unknown-repo-that-does-not-exist'), false)
    // prettier-ignore
    assert.equal(await verifyTemplate('bitbucket:bluwy/unknown-repo-that-does-not-exist'), false)
    assert.equal(await verifyTemplate('unjs/template/not-exist'), false)
    assert.equal(await verifyTemplate('unjs/template#not-exist'), false)
  })
})
