import path from 'node:path'
import { debug, parseGitURI, sendFetch } from './utils.js'

/** @import { TemplateProvider, TemplateInfo, GitInfo, ProviderOptions } from './index.d.ts' */

/** @typedef {(input: string, options: { auth?: string }) => Promise<TemplateInfo>} AsyncTemplateProvider */

// weird ts issue that needs this workaround
/** @type {AsyncTemplateProvider} */
export const http = async (input, options) => {
  const url = new URL(input)
  const name = path.basename(url.pathname)
  return {
    name,
    version: undefined,
    subdir: undefined,
    url: url.href,
    tar: url.href,
    defaultDir: name,
    headers: options.auth
      ? { Authorization: `Bearer ${options.auth}` }
      : undefined,
  }
}

// https://docs.github.com/en/rest/repos/contents#download-a-repository-archive-tar
// TODO: Verify solution for github enterprise
/** @type {AsyncTemplateProvider} */
export const github = async (input, options) => {
  const parsed = parseGitURI(input)
  const ref = await getRef(parsed, options, async () => {
    const res = await sendFetch(`https://api.github.com/repos/${parsed.repo}`)
    const json = await res.json()
    return json?.default_branch
  })

  return {
    name: parsed.repo.replace('/', '-'),
    version: ref,
    subdir: parsed.subdir,
    headers: {
      ...(options.auth ? { Authorization: `Bearer ${options.auth}` } : {}),
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    url: `https://github.com/${parsed.repo}/tree/${ref}${parsed.subdir}`,
    tar: `https://api.github.com/repos/${parsed.repo}/tarball/${ref}`,
  }
}

/** @type {AsyncTemplateProvider} */
export const gitlab = async (input, options) => {
  const parsed = parseGitURI(input)
  const ref = await getRef(parsed, options, async () => {
    const res = await sendFetch(
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(parsed.repo)}`,
    )
    const json = await res.json()
    return json?.default_branch
  })

  return {
    name: parsed.repo.replace('/', '-'),
    version: ref,
    subdir: parsed.subdir,
    headers: {
      ...(options.auth ? { Authorization: `Bearer ${options.auth}` } : {}),
      // https://gitlab.com/gitlab-org/gitlab/-/commit/50c11f278d18fe1f3fb12eb595067216bb58ade2
      'sec-fetch-mode': 'same-origin',
    },
    url: `https://gitlab.com/${parsed.repo}/tree/${ref}${parsed.subdir}`,
    tar: `https://gitlab.com/${parsed.repo}/-/archive/${ref}.tar.gz`,
  }
}

/** @type {AsyncTemplateProvider} */
export const bitbucket = async (input, options) => {
  const parsed = parseGitURI(input)
  const ref = await getRef(parsed, options, async () => {
    const res = await sendFetch(
      `https://api.bitbucket.org/2.0/repositories/${parsed.repo}`,
    )
    const json = await res.json()
    return json?.mainbranch?.name
  })

  return {
    name: parsed.repo.replace('/', '-'),
    version: ref,
    subdir: parsed.subdir,
    headers: options.auth ? { Authorization: `Bearer ${options.auth}` } : {},
    url: `https://bitbucket.com/${parsed.repo}/src/${ref}${parsed.subdir}`,
    tar: `https://bitbucket.org/${parsed.repo}/get/${ref}.tar.gz`,
  }
}

/** @type {TemplateProvider} */
export const sourcehut = (input, options) => {
  const parsed = parseGitURI(input)
  const ref = parsed.ref || 'main'
  // NOTE: sourcehut does not have a public API to get the default branch, unless
  // we try to fetch the HTML and parse it. skip implementing it for now.

  return {
    name: parsed.repo.replace('/', '-'),
    version: ref,
    subdir: parsed.subdir,
    headers: options.auth ? { Authorization: `Bearer ${options.auth}` } : {},
    url: `https://git.sr.ht/~${parsed.repo}/tree/${ref}/item${parsed.subdir}`,
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

/**
 * @param {GitInfo} parsed
 * @param {ProviderOptions} options
 * @param {() => Promise<string | undefined>} fetchRef
 */
async function getRef(parsed, options, fetchRef) {
  if (parsed.ref) return parsed.ref

  // If offline is true, we don't fetch anything. In the future, maybe we should
  // cache this result to support `offline: 'prefer'`.
  if (options.offline !== true) {
    try {
      const ref = await fetchRef()
      if (ref) return ref
    } catch (error) {
      debug(`Failed to fetch ref for ${parsed.repo}`, error)
    }
  }

  return 'main'
}
