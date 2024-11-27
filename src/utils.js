import fs from 'node:fs/promises'
import fss from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import { extract as _extract } from 'tar'
import { DownloadFailedError, SubdirNotFoundError } from './errors.js'
import { providers as builtinProviders } from './providers.js'

/** @import { ProviderName, TemplateProvider } from './index.d.ts' */

const sourceProtoRe = /^([\w-.]+):/

/**
 *
 * @param {string} input
 * @param {ProviderName | undefined} providerName
 * @param {Record<ProviderName, TemplateProvider> | undefined} providers
 * @returns {{ source: string, providerName: ProviderName, provider: TemplateProvider | undefined }}
 */
export function getProvider(input, providerName, providers) {
  providerName ||= 'github'

  let source = input
  const sourceProvierMatch = input.match(sourceProtoRe)
  if (sourceProvierMatch) {
    providerName = sourceProvierMatch[1]
    if (providerName !== 'http' && providerName !== 'https') {
      source = input.slice(sourceProvierMatch[0].length)
    }
  }

  const provider = providers?.[providerName] || builtinProviders[providerName]

  return {
    source,
    providerName,
    provider,
  }
}

/**
 * @param {string} url
 * @param {string} filePath
 * @param {RequestInit} [options]
 * @returns
 */
export async function download(url, filePath, options = {}) {
  const infoPath = filePath + '.json'
  /** @type {{ etag?: string }} */
  const info = JSON.parse(await fs.readFile(infoPath, 'utf8').catch(() => '{}'))
  const headResponse = await sendFetch(url, {
    ...options,
    method: 'HEAD',
  }).catch(() => undefined)
  const etag = headResponse?.headers.get('etag')
  if (info.etag === etag && fss.existsSync(filePath)) {
    // Already downloaded
    return
  }
  if (typeof etag === 'string') {
    info.etag = etag
  }

  const response = await sendFetch(url, { headers: options.headers })
  if (response.status >= 400) {
    throw new DownloadFailedError(
      `Failed to download ${url}: ${response.status} ${response.statusText}`,
    )
  }
  if (response.body == null) {
    throw new DownloadFailedError(
      `Failed to download ${url}: empty response body`,
    )
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const stream = fss.createWriteStream(filePath)
  await promisify(pipeline)(response.body, stream)

  await fs.writeFile(infoPath, JSON.stringify(info), 'utf8')
}

const inputRegex =
  /^(?<repo>[\w\-.]+\/[\w\-.]+)(?<subdir>[^#]+)?(?<ref>#[\w\-./@]+)?/

/** @type {import('./index.d.ts').parseGitURI} */
export function parseGitURI(input) {
  const m = input.match(inputRegex)?.groups || {}
  return {
    repo: m.repo,
    subdir: m.subdir || '/',
    ref: m.ref?.slice(1),
  }
}

/**
 * @param  {...unknown} args
 */
export function debug(...args) {
  if (process.env.DEBUG) {
    console.debug('[giget]', ...args)
  }
}

/**
 * @param {string} url
 * @param {RequestInit & { validateStatus?: boolean }} [options]
 */
export async function sendFetch(url, options = {}) {
  // https://github.com/nodejs/undici/issues/1305
  if (options.headers?.['sec-fetch-mode']) {
    options.mode = options.headers['sec-fetch-mode']
  }

  const res = await fetch(url, options).catch((error) => {
    throw new Error(`Failed to fetch ${url}`, { cause: error })
  })

  if (options.validateStatus && res.status >= 400) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  }

  return res
}

export function cacheDirectory() {
  return process.env.XDG_CACHE_HOME
    ? path.resolve(process.env.XDG_CACHE_HOME, 'bluwy-giget')
    : path.resolve(os.homedir(), '.cache/bluwy-giget')
}

/**
 * @param {string} tarPath
 * @param {string} extractPath
 * @param {string} [subdir]
 */
export async function extract(tarPath, extractPath, subdir) {
  // subdir `/` is the same as root, so ignore as undefined
  if (subdir === '/') {
    subdir = undefined
  }
  // If `subdir` is defined, ensure it has no leading slash, and has a trailing slash
  if (subdir) {
    if (subdir.startsWith('/')) {
      subdir = subdir.slice(1)
    }
    if (!subdir.endsWith('/')) {
      subdir += '/'
    }
  }

  let subdirFound = false
  // Create an empty directory here to make tar happy
  await fs.mkdir(extractPath, { recursive: true })

  // NOTE: using tar@6 because v7 is HUGE
  await _extract({
    file: tarPath,
    cwd: extractPath,
    onentry(entry) {
      entry.path = entry.path.split('/').splice(1).join('/')
      if (subdir) {
        if (entry.path.startsWith(subdir)) {
          // Rewrite path
          entry.path = entry.path.slice(subdir.length - 1)
          subdirFound = true
        } else {
          // Skip
          entry.path = ''
        }
      }
    },
  })

  if (subdir && !subdirFound) {
    // Clean up as it should be empty
    await fs.rm(extractPath, { recursive: true, force: true })
    throw new SubdirNotFoundError(`Subdirectory not found in tar: ${subdir}`)
  }
}
