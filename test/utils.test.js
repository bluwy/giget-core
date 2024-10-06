import { it, describe } from 'node:test'
import assert from 'node:assert/strict'
import { parseGitURI } from '../src/utils.js'

describe('parseGitURI', () => {
  const defaults = { repo: 'org/repo', subdir: '/', ref: undefined }
  const tests = [
    { input: 'org/repo', output: {} },
    { input: 'org/repo#ref', output: { ref: 'ref' } },
    { input: 'org/repo#ref-123', output: { ref: 'ref-123' } },
    { input: 'org/repo#ref/ABC-123', output: { ref: 'ref/ABC-123' } },
    { input: 'org/repo#@org/tag@1.2.3', output: { ref: '@org/tag@1.2.3' } },
    { input: 'org/repo/foo/bar', output: { subdir: '/foo/bar' } },
  ]

  for (const test of tests) {
    it(test.input, () => {
      assert.deepEqual(parseGitURI(test.input), {
        ...defaults,
        ...test.output,
      })
    })
  }
})
