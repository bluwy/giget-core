import fs from 'node:fs/promises'
import fss from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import { parseTarGzip } from 'nanotar'

/** @import { GitInfo } from './index.d.ts' */

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
    throw new Error(
      `Failed to download ${url}: ${response.status} ${response.statusText}`,
    )
  }
  if (response.body == null) {
    throw new Error(`Failed to download ${url}: empty response body`)
  }

  const stream = fss.createWriteStream(filePath)
  await promisify(pipeline)(response.body, stream)

  await fs.writeFile(infoPath, JSON.stringify(info), 'utf8')
}

const inputRegex =
  /^(?<repo>[\w.-]+\/[\w.-]+)(?<subdir>[^#]+)?(?<ref>#[\w./@-]+)?/

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
 * @param {string} url
 * @param {RequestInit & { validateStatus?: boolean }} [options]
 * @returns
 */
export async function sendFetch(url, options = {}) {
  // https://github.com/nodejs/undici/issues/1305
  if (options.headers?.['sec-fetch-mode']) {
    options.mode = options.headers['sec-fetch-mode']
  }

  const res = await fetch(url, options).catch((error) => {
    throw new Error(`Failed to download ${url}`, { cause: error })
  })

  if (options.validateStatus && res.status >= 400) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  }

  return res
}

export function cacheDirectory() {
  return process.env.XDG_CACHE_HOME
    ? path.resolve(process.env.XDG_CACHE_HOME, 'download-template')
    : path.resolve(os.homedir(), '.cache/download-template')
}

/**
 * @param {string} tarPath
 * @param {string} extractPath
 * @param {string} [subdir]
 */
export async function extract(tarPath, extractPath, subdir) {
  const tarBuffer = await fs.readFile(tarPath)
  const tarFiles = await parseTarGzip(tarBuffer)
  subdir = subdir?.replace(/^\//, '') || ''

  /** @type {string | null | undefined} */
  let root
  for (const file of tarFiles) {
    if (file.name === 'pax_global_header') continue

    // The first tar file should be the root directory
    if (root === undefined) {
      if (file.name.endsWith('/')) {
        root = file.name
      } else {
        root = null
      }
    }

    // Skip directories, only handle files
    if (file.name.endsWith('/') || file.data == null) {
      continue
    }

    // Get the absolute file path, skip if not part of subdir
    let filePath = root ? file.name.slice(root.length) : file.name
    if (subdir) {
      if (!filePath.startsWith(subdir)) {
        continue
      }
      filePath = filePath.slice(subdir.length)
    }
    filePath = path.join(extractPath, filePath)

    // Write file
    if (file.name.includes('/')) {
      await fs.mkdir(path.dirname(filePath), { recursive: true })
    }
    await fs.writeFile(filePath, Buffer.from(file.data))
  }
}
