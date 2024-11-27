# @bluwy/giget-core

A JavaScript API to download a template from a git repository or URL. The code is largely based on [giget](https://github.com/unjs/giget) (and includes its license), but with the below main differences:

- Only the JavaScript API. The CLI and unrelated APIs are stripped off.
- Reduced dependencies to only 1 ([tar](https://github.com/isaacs/node-tar)).
- Modified API interface (reduce input and output surface).
- Removed custom registries and JSON template support.
- Removed `GIGET_` special environment variables support.
- Supports fetching the default branch of a repository.
- Additional API utilities.
- Node >=18 and ESM only.

## Usage

The API is heavily documented in [./src/index.d.ts](./src/index.d.ts). Below shows some examples of using them:

### `downloadTemplate`

Download a template with a given input string.

```js
import { downloadTemplate } from '@bluwy/giget-core'

// Basic usage. Download from github repo.
const result = await downloadTemplate('unjs/template')
// info: { ... } - The template information parsed by providers
// dir: '...' - The directory where the template is downloaded to
// source: '...' - The source URL of the template (Prefix like `gh:` is stripped)

// Other input syntaxes
await downloadTemplate('unjs/template/subdir')
await downloadTemplate('unjs/template#main')
await downloadTemplate('gh:unjs/template')
await downloadTemplate('gitlab:unjs/template')
await downloadTemplate('bitbucket:unjs/template')
await downloadTemplate(
  'https://api.github.com/repos/unjs/template/tarball/main',
)

// Download to a specific directory (relative to cwd)
await downloadTemplate('unjs/template', { dir: 'my-project' })

// Download to a directory even if it has existing content
// (merges directories and replaces matching files)
await downloadTemplate('unjs/template', { force: true })

// Clean directory before downloading to it
await downloadTemplate('unjs/template', { force: 'clean' })

// Use offline cache only
await downloadTemplate('unjs/template', { offline: true })

// Use offline cache if available, otherwise download
await downloadTemplate('unjs/template', { offline: 'prefer' })

// Specify provider explicitly (if input has a provider prefix, it'll
// take precedence instead)
await downloadTemplate('unjs/template', { provider: 'gitlab' })

// Pass authentication token to access private repositories
// (handled by providers to pass as headers when downloading the tarball)
await downloadTemplate('unjs/template', { providerOptions: { auth: 'xxx' } })
```

### `verifyTemplate`

Check whether the template is valid. Requires network access.

```js
import { verifyTemplate } from '@bluwy/giget-core'

await verifyTemplate('unjs/template') // true
await verifyTemplate('unjs/template/subdir') // true
await verifyTemplate('unjs/template#main') // true
await verifyTemplate('gh:unjs/template') // true
await verifyTemplate('gitlab:unjs/template') // true
await verifyTemplate('bitbucket:unjs/template') // true
await verifyTemplate('https://api.github.com/repos/unjs/template/tarball/main') // true

await verifyTemplate('unjs/non-existent-repo') // false
await verifyTemplate('unjs/template/not-existent-subdir') // false
await verifyTemplate('unjs/template#not-existent-branch') // false
```

### `parseGitURI`

Parse an input (e.g. `'owner/repo/templates/foo#main'`) into a `GitInfo` object. Useful for custom providers that need to parse the given input.

```js
import { parseGitURI } from '@bluwy/giget-core'

parseGitURI('owner/repo') // { repo: 'owner/repo', subdir: '/' }
parseGitURI('owner/repo/subdir') // { repo: 'owner/repo', subdir: '/subdir' }
parseGitURI('owner/repo#main') // { repo: 'owner/repo', subdir: '/', ref: 'main' }
parseGitURI('owner/repo/subdir#main') // { repo: 'owner/repo', subdir: '/subdir', ref: 'main' }
```

## Migrate from giget

`giget` exports a `downloadTemplate` programmatic API as well. For most basic usecases, there's no significant difference and should be a drop-in replacement. However, there's certain features that work differently:

- The `forceClean` option is merged as `force: 'clean'`.
- The `preferOffline` option is merged as `offline: 'prefer'`.
- The `registry` option is removed. You can no longer download templates hosted from [giget](https://github.com/unjs/giget/tree/main/templates). Pass the direct tarball URL or git repo instead.
- The `install` and `silent` options used for installing dependencies is removed. You should manually install the dependencies yourself. Previously `giget` used [nypm](https://github.com/unjs/nypm) under the hood.
- The `auth` option is moved to `providerOptions.auth`.
- The `TemplateProvider` and `TemplateInfo` interfaces used by the `providers` option is slightly changed.
  - `TemplateProvider`: The function must return a `TemplateInfo` instead of null. If it fails to handle something, it should try a helpful error.
  - `TemplateInfo`: It no longer allows returning arbitrary keys in the object.
- The returned object has the `TemplateInfo` on the `info` property instead of spreading on the returned object.
- Any `GIGET_` environment variables support are removed. They should be passed as explicit options instead.

## Attribution

As mentioned above, this project is based heavily on [giget](https://github.com/unjs/giget)! Thanks [@pi0](https://github.com/pi0) for the original work and battle-testing it.

In the future, I hope the code here can be merged back to `giget`, perhaps as a `giget-core` library, and have the `giget` CLI as a wrapper library.

## License

MIT
