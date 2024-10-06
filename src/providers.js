import path from 'node:path'
import { parseGitURI, sendFetch } from './utils.js'

/** @import { TemplateProvider, TemplateInfo } from './index.d.ts' */

/** @typedef {(input: string, options: { auth?: string }) => Promise<TemplateInfo>} AsyncTemplateProvider */

/** @type {AsyncTemplateProvider} */
export const http = async (input, options) => {
  if (input.endsWith('.json')) {
    return await _httpJSON(input, options)
  }

  const url = new URL(input)
  let name = path.basename(url.pathname)

  try {
    const head = await sendFetch(url.href, {
      method: 'HEAD',
      validateStatus: true,
      headers: options.auth
        ? { Authorization: `Bearer ${options.auth}` }
        : undefined,
    })
    const _contentType = head.headers.get('content-type') || ''
    if (_contentType.includes('application/json')) {
      return await _httpJSON(input, options)
    }
    const filename = head.headers
      .get('content-disposition')
      ?.match(/filename="?(.+)"?/)?.[1]
    if (filename) {
      name = filename.split('.')[0]
    }
  } catch (error) {
    // console.log(`Failed to fetch HEAD for ${url.href}:`, error);
  }

  return {
    name: `${name}-${url.href.slice(0, 8)}`,
    version: undefined,
    subdir: undefined,
    tar: url.href,
    defaultDir: name,
    headers: options.auth
      ? { Authorization: `Bearer ${options.auth}` }
      : undefined,
  }
}

/** @type {AsyncTemplateProvider} */
const _httpJSON = async (input, options) => {
  const result = await sendFetch(input, {
    validateStatus: true,
    headers: options.auth
      ? { Authorization: `Bearer ${options.auth}` }
      : undefined,
  })
  /** @type {TemplateInfo} */
  const info = await result.json()
  if (!info.tar || !info.name) {
    throw new Error(
      `Invalid template info from ${input}. name or tar fields are missing!`,
    )
  }
  return info
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
