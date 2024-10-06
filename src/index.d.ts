export interface GitInfo {
  provider: 'github' | 'gitlab' | 'bitbucket' | 'sourcehut'
  repo: string
  subdir: string
  ref: string
}

export interface TemplateInfo {
  name: string
  tar: string
  version?: string
  subdir?: string
  url?: string
  defaultDir?: string
  headers?: Record<string, string>

  // Added by giget
  source?: never
  dir?: never

  [key: string]: any
}

export type TemplateProvider = (
  input: string,
  options: { auth?: string },
) => TemplateInfo | Promise<TemplateInfo> | null

export interface DownloadTemplateOptions {
  provider?: string
  force?: boolean
  forceClean?: boolean
  offline?: boolean
  preferOffline?: boolean
  providers?: Record<string, TemplateProvider>
  dir?: string
  cwd?: string
  auth?: string
}

// Mostly copied from `TemplateInfo`. For some reason TS doesn't give autocompletion
// when extending and omitting the `source` and `dir` fields.
export interface DownloadTemplateResult {
  name: string
  tar: string
  version?: string
  subdir?: string
  url?: string
  defaultDir?: string
  headers?: Record<string, string>

  // Added by giget
  source: string
  dir: string

  [key: string]: any
}

export declare function downloadTemplate(
  input: string,
  options?: DownloadTemplateOptions,
): Promise<DownloadTemplateResult>
