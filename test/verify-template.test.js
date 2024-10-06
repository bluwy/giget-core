import { it, describe } from 'node:test'
import assert from 'node:assert/strict'
import { verifyTemplate } from '../src/index.js'

describe('verifyTemplate', () => {
  const tests = [
    { input: 'unjs/template', output: true },
    { input: 'gh:unjs/template', output: true },
    { input: 'gitlab:unjs/template', output: true },
    { input: 'bitbucket:unjs/template', output: true },
    {
      input: 'https://api.github.com/repos/unjs/template/tarball/main',
      output: true,
    },
    { input: 'bluwy/unknown-repo-that-does-not-exist', output: false },
    {
      input: 'bitbucket:bluwy/unknown-repo-that-does-not-exist',
      output: false,
    },
    { input: 'unjs/template/not-exist', output: false },
    { input: 'unjs/template#not-exist', output: false },
  ]

  for (const test of tests) {
    it(test.input, async () => {
      assert.equal(await verifyTemplate(test.input), test.output)
    })
  }
})
