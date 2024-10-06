import path from 'node:path'
import { parseGitURI } from './utils.js'

/** @import { TemplateProvider, TemplateInfo } from './index.d.ts' */

/** @typedef {(input: string, options: { auth?: string }) => Promise<TemplateInfo>} AsyncTemplateProvider */

/** @type {AsyncTemplateProvider} */
export const http = async (input, options) => {
  const url = new URL(input)
  const name = path.basename(url.pathname)

  return {
    name,
    version: undefined,
    subdir: undefined,
    tar: url.href,
    defaultDir: name,
    headers: options.auth
      ? { Authorization: `Bearer ${options.auth}` }
      : undefined,
  }
}

/** @type {TemplateProvider} */
export const github = (input, options) => {
  const parsed = parseGitURI(input)
  const ref = parsed.ref || 'main'

  // https://docs.github.com/en/rest/repos/contents#download-a-repository-archive-tar
  // TODO: Verify solution for github enterprise
  const githubAPIURL = 'https://api.github.com'

  return {
    name: parsed.repo.replace('/', '-'),
    version: ref,
    subdir: parsed.subdir,
    headers: {
      ...(options.auth ? { Authorization: `Bearer ${options.auth}` } : {}),
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    tar: `${githubAPIURL}/repos/${parsed.repo}/tarball/${ref}`,
  }
}

/** @type {TemplateProvider} */
export const gitlab = (input, options) => {
  const parsed = parseGitURI(input)
  const ref = parsed.ref || 'main'
  const gitlab = 'https://gitlab.com'
  return {
    name: parsed.repo.replace('/', '-'),
    version: ref,
    subdir: parsed.subdir,
    headers: {
      ...(options.auth ? { Authorization: `Bearer ${options.auth}` } : {}),
      // https://gitlab.com/gitlab-org/gitlab/-/commit/50c11f278d18fe1f3fb12eb595067216bb58ade2
      'sec-fetch-mode': 'same-origin',
    },
    tar: `${gitlab}/${parsed.repo}/-/archive/${ref}.tar.gz`,
  }
}

/** @type {TemplateProvider} */
export const bitbucket = (input, options) => {
  const parsed = parseGitURI(input)
  const ref = parsed.ref || 'main'
  return {
    name: parsed.repo.replace('/', '-'),
    version: ref,
    subdir: parsed.subdir,
    headers: options.auth ? { Authorization: `Bearer ${options.auth}` } : {},
    tar: `https://bitbucket.org/${parsed.repo}/get/${ref}.tar.gz`,
  }
}

/** @type {TemplateProvider} */
export const sourcehut = (input, options) => {
  const parsed = parseGitURI(input)
  const ref = parsed.ref || 'main'
  return {
    name: parsed.repo.replace('/', '-'),
    version: ref,
    subdir: parsed.subdir,
    headers: options.auth ? { Authorization: `Bearer ${options.auth}` } : {},
    tar: `https://git.sr.ht/~${parsed.repo}/archive/${ref}.tar.gz`,
  }
}

/** @type {Record<string, TemplateProvider>} */
export const providers = {
  http,
  https: http,
  github,
  gh: github,
  gitlab,
  bitbucket,
  sourcehut,
}
