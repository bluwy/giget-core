import fs from 'node:fs/promises'
import fss from 'node:fs'
import path from 'node:path'
import {
  cacheDirectory,
  debug,
  download,
  extract,
  getProvider,
} from './utils.js'
import { UnsupportedProviderError, DirExistError } from './errors.js'

/** @type {import('./index.d.ts').downloadTemplate} */
export async function downloadTemplate(input, options = {}) {
  const { source, providerName, provider } = getProvider(
    input,
    options.provider,
    options.providers,
  )
  if (!provider) {
    throw new UnsupportedProviderError(`Unsupported provider: ${providerName}`)
  }

  const providerOptions = {
    ...options.providerOptions,
    offline: options.offline,
  }
  const template = await Promise.resolve()
    .then(() => provider(source, providerOptions))
    .catch((error) => {
      throw new Error(`The ${providerName} provider failed with errors`, {
        cause: error,
      })
    })

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

  if (
    options.offline === 'prefer' ? !fss.existsSync(tarPath) : !options.offline
  ) {
    await download(template.tar, tarPath, { headers: template.headers }).catch(
      (error) => {
        if (!fss.existsSync(tarPath)) {
          throw error
        }
        // Accept network errors if we have a cached version
        debug('Download error. Using cached version:', error)
      },
    )
    debug(`Downloaded ${template.tar} to ${tarPath}`)
  }

  if (!fss.existsSync(tarPath)) {
    throw new Error(
      `Tarball not found: ${tarPath} (offline: ${options.offline})`,
    )
  }

  // Extract template
  const cwd = path.resolve(options.cwd || '.')
  const extractPath = path.resolve(cwd, options.dir || template.defaultDir)
  if (options.force === 'clean') {
    await fs.rm(extractPath, { recursive: true, force: true })
  } else if (
    !options.force &&
    fss.existsSync(extractPath) &&
    fss.readdirSync(extractPath).length > 0
  ) {
    throw new DirExistError(`Destination ${extractPath} already exists.`)
  }

  // NOTE: The extraction will create the extract directory for us, so we don't have
  // to do so here in case the extraction errors out and causes an undesired empty
  // directory that's left behind.

  await extract(tarPath, extractPath, template.subdir)

  return {
    info: template,
    source,
    dir: extractPath,
  }
}
