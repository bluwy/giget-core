import { UnsupportedProviderError } from './errors.js'
import { getProvider, sendFetch } from './utils.js'

/** @type {import('./index.d.ts').verifyTemplate} */
export async function verifyTemplate(input, options = {}) {
  const { source, providerName, provider } = getProvider(
    input,
    options.provider,
    options.providers,
  )
  if (!provider) {
    throw new UnsupportedProviderError(`Unsupported provider: ${providerName}`)
  }

  // NOTE: `offline` is not passed as `verifyTemplate` itself is documented to require network access
  const providerOptions = { ...options.providerOptions }
  const template = await Promise.resolve()
    .then(() => provider(source, providerOptions))
    .catch((error) => {
      throw new Error(`The ${providerName} provider failed with errors`, {
        cause: error,
      })
    })

  if (template.url) {
    const response = await sendFetch(template.url, {
      method: 'HEAD',
      headers: template.headers,
    })
    return response.status >= 200 && response.status < 300
  }

  // If `template.url` is not defined, assume that the template is valid given
  // that `provider()` was able to parse it
  return true
}
