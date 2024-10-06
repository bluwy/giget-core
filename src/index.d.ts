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
   * The default directory name to write the template to. If not set, the `name`
   * is used instead
   */
  defaultDir?: string
  /**
   * Additional headers needed to fetch the tarball
   */
  headers?: Record<string, string>
}

export type TemplateProvider = (
  input: string,
  options: { auth?: string },
) => TemplateInfo | null | Promise<TemplateInfo | null>

export type ProviderName =
  | 'github'
  | 'gitlab'
  | 'bitbucket'
  | 'sourcehut'
  | (string & {})

export interface DownloadTemplateOptions {
  /**
   * Specify the specific provider to use. If not set, it will be inferred from the `input`
   * prefix (e.g. `gh:` will use the `github` provider), or falls back to `github`.
   */
  provider?: ProviderName
  /**
   * Whether to always force copy the template to the `dir` even if there's existing
   * content in the directory.
   * - `true`: Force copy to the directory (may overwrite existing files)
   * - `'clean'`: Always remove the directory first before copying
   * - `false`: If there's existing content, skip copying and error
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
   * Additional providers to use for fetching templates. This can have the same name as the buitlin
   * providers to override their implementation if needed, and if the provider returns null, it will
   * fallback to the builtin provider.
   */
  providers?: Record<ProviderName, TemplateProvider>
  /**
   * The directory to copy to. If unset, it defaults to the `defaultDir` or `name` of the template
   * handled by the provider.
   */
  dir?: string
  /**
   * The current working directory used for resolving the `dir` path
   */
  cwd?: string
  /**
   * The authentication token used for fetching the template tarball (e.g. private repos)
   */
  auth?: string
}

export interface DownloadTemplateResult extends TemplateInfo {
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

export interface GitInfo {
  repo: string
  subdir: string
  ref?: string
}

export declare function parseGitURI(input: string): GitInfo

export declare class UnsupportedProviderError extends Error {}
export declare class DownloadFailedError extends Error {}
export declare class SubdirNotFoundError extends Error {}
export declare class DirExistError extends Error {}
