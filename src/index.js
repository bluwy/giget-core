import fs from 'node:fs/promises'
import fss from 'node:fs'
import path from 'node:path'
import { cacheDirectory, download, extract } from './utils.js'
import { providers } from './providers.js'

const sourceProtoRe = /^([\w-.]+):/

export { parseGitURI } from './utils.js'

/** @type {import('./index.d.ts').downloadTemplate} */
export async function downloadTemplate(input, options = {}) {
  let providerName = options.provider || 'github'

  let source = input
  const sourceProvierMatch = input.match(sourceProtoRe)
  if (sourceProvierMatch) {
    providerName = sourceProvierMatch[1]
    if (providerName !== 'http' && providerName !== 'https') {
      source = input.slice(sourceProvierMatch[0].length)
    }
  }

  const provider = options.providers?.[providerName] || providers[providerName]
  if (!provider) {
    throw new Error(`Unsupported provider: ${providerName}`)
  }

  const template = await Promise.resolve()
    .then(() => provider(source, { auth: options.auth }))
    .catch((error) => {
      throw new Error(`Failed to download template from ${providerName}`, {
        cause: error,
      })
    })

  if (!template) {
    throw new Error(`Failed to resolve template from ${providerName}`)
  }

  // Sanitize name and defaultDir
  template.name = (template.name || 'template').replace(/[^\da-z-]/gi, '-')
  template.defaultDir = (template.defaultDir || template.name).replace(
    /[^\da-z-]/gi,
    '-',
  )

  // Download template source
  const temporaryDirectory = path.resolve(
    cacheDirectory(),
    providerName,
    template.name,
  )
  const tarPath = path.resolve(
    temporaryDirectory,
    (template.version || template.name) + '.tar.gz',
  )

  if (options.preferOffline && fss.existsSync(tarPath)) {
    options.offline = true
  }
  if (!options.offline) {
    await fs.mkdir(path.dirname(tarPath), { recursive: true })
    await download(template.tar, tarPath, {
      headers: {
        ...(options.auth ? { Authorization: `Bearer ${options.auth}` } : {}),
        ...template.headers,
      },
    }).catch((error) => {
      if (!fss.existsSync(tarPath)) {
        throw error
      }
      // Accept network errors if we have a cached version
      options.offline = true
    })
  }

  if (!fss.existsSync(tarPath)) {
    throw new Error(
      `Tarball not found: ${tarPath} (offline: ${options.offline})`,
    )
  }

  // Extract template
  const cwd = path.resolve(options.cwd || '.')
  const extractPath = path.resolve(cwd, options.dir || template.defaultDir)
  if (options.forceClean) {
    await fs.rm(extractPath, { recursive: true, force: true })
  }
  if (
    !options.force &&
    fss.existsSync(extractPath) &&
    fss.readdirSync(extractPath).length > 0
  ) {
    throw new Error(`Destination ${extractPath} already exists.`)
  }
  await fs.mkdir(extractPath, { recursive: true })

  await extract(tarPath, extractPath, template.subdir)

  // await extract({
  //   file: tarPath,
  //   cwd: extractPath,
  //   onentry(entry) {
  //     entry.path = entry.path.split('/').splice(1).join('/')
  //     if (subdir) {
  //       // eslint-disable-next-line unicorn/prefer-ternary
  //       if (entry.path.startsWith(subdir + '/')) {
  //         // Rewrite path
  //         entry.path = entry.path.slice(subdir.length)
  //       } else {
  //         // Skip
  //         entry.path = ''
  //       }
  //     }
  //   },
  // })

  return {
    ...template,
    source,
    dir: extractPath,
  }
}
