export interface TemplateInfo {
  /**
   * The default template name (usually inferred from the repo name)
   */
  name: string
  /**
   * The URL to the tarball of the template
   */
  tar: string
  /**
   * The current version of the template (used for caching)
   */
  version?: string
  /**
   * If the tarball URL downloads the entire repo, this value can be specified
   * to extract only a subdirectory from the tarball
   */
  subdir?: string
  /**
   * The URL to the original source of the template. Used for pinging the source
   * by `verifyTemplate` to check if the template is valid. If not set, `verifyTemplate`
   * will return `true` assuming that it exists.
   */
  url?: string
  /**
   * The default directory name to write the template to. If not set, the `name`
   * is used instead
   */
  defaultDir?: string
  /**
   * Additional headers needed to fetch the tarball
   */
  headers?: Record<string, string>
}

// NOTE: Allow extending in the future to pass additional options to custom or builtin providers
export interface ProviderOptions {
  /**
   * The authentication token used for fetching the template tarball (e.g. private repos)
   */
  auth?: string
  /**
   * Whether to prefer offline mode (i.e. don't make network requests).
   * - `true`: Only use offline mode, will error if no cache is found
   * - `'prefer'`: Use offline mode if there's a cache, otherwise fallback to fetching the template
   * - `false`: Always fetch the template
   *
   * If the provider needs to send network requests, it should respect this option.
   */
  offline?: boolean | 'prefer'
}

export type TemplateProvider = (
  /**
   * The input string with provider prefix like `gh:` stripped
   */
  input: string,
  options: ProviderOptions,
) => TemplateInfo | Promise<TemplateInfo>

export type ProviderName =
  | 'github'
  | 'gitlab'
  | 'bitbucket'
  | 'sourcehut'
  | (string & {})

export interface DownloadTemplateOptions {
  /**
   * The directory to download the template to. If unset, it defaults to the `defaultDir` or `name` of the template
   * handled by the provider.
   */
  dir?: string
  /**
   * The current working directory used for resolving the `dir` path
   */
  cwd?: string
  /**
   * Whether to always force download the template to the `dir` even if there's existing
   * content in the directory.
   * - `true`: Force download to the directory (may overwrite existing files)
   * - `'clean'`: Always remove the directory first before downloading
   * - `false`: If there's existing content, skip download and error
   *
   * @default false
   */
  force?: boolean | 'clean'
  /**
   * Whether to prefer offline mode (i.e. don't make network requests).
   * - `true`: Only use offline mode, will error if no cache is found
   * - `'prefer'`: Use offline mode if there's a cache, otherwise fallback to fetching the template
   * - `false`: Always fetch the template
   *
   * @default false
   */
  offline?: boolean | 'prefer'
  /**
   * Specify the specific provider to use. If not set, it will be inferred from the `input`
   * prefix (e.g. `gh:` will use the `github` provider), or falls back to `github`.
   */
  provider?: ProviderName
  /**
   * Additional providers to use for fetching templates. This can have the same name as the buitlin
   * providers to override their implementation if needed.
   */
  providers?: Record<ProviderName, TemplateProvider>
  /**
   * Additional options to pass to the provider
   */
  providerOptions?: Pick<ProviderOptions, 'auth'>
}

export interface DownloadTemplateResult {
  /**
   * The parsed template information
   */
  info: TemplateInfo
  /**
   * The source URL of the template (Prefix like `gh:` is stripped)
   */
  source: string
  /**
   * The directory where the template was copied to
   */
  dir: string
}

/**
 * Download a template with a given input, e.g.:
 * - `owner/repo` (github)
 * - `gh:owner/repo`
 * - `github:owner/repo`
 * - `gitlab:owner/repo`
 * - `bitbucket:owner/repo`
 * - `sourcehut:owner/repo`
 * - `https://api.github.com/repos/owner/repo/tarball/main`
 */
export declare function downloadTemplate(
  input: string,
  options?: DownloadTemplateOptions,
): Promise<DownloadTemplateResult>

export interface VerifyTemplateOptions
  extends Pick<
    DownloadTemplateOptions,
    'provider' | 'providers' | 'providerOptions'
  > {}

/**
 * Check whether the template is valid. Requires network access.
 */
export declare function verifyTemplate(
  input: string,
  options?: VerifyTemplateOptions,
): Promise<boolean>

export interface GitInfo {
  /**
   * @example 'owner/repo'
   */
  repo: string
  /**
   * @example '/' or '/templates/foo'
   */
  subdir: string
  /**
   * @example 'main' or undefined
   */
  ref?: string
}

/**
 * Parse an input (e.g. `'owner/repo/templates/foo#main'`) into a `GitInfo` object.
 * Useful for custom providers that need to parse the given input.
 */
export declare function parseGitURI(input: string): GitInfo

/**
 * A provider name is given but it doesn't match any of the supported providers
 */
export declare class UnsupportedProviderError extends Error {}
/**
 * An error happened while downloading the template tarball
 */
export declare class DownloadFailedError extends Error {}
/**
 * The template subdirectory specified to download doesn't exist
 */
export declare class SubdirNotFoundError extends Error {}
/**
 * The directory to download the template to already exists
 */
export declare class DirExistError extends Error {}
