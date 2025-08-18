const { execSync } = require('child_process')
const path = require('path')

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', shell: true, ...opts })
}

function main() {
  const root = process.cwd()
  const nativeDir = path.join(root, 'native')
  const pkg = require(path.join(root, 'package.json'))
  const electron = (pkg.devDependencies && pkg.devDependencies.electron) || ''
  const version = (electron || '').replace(/^[^0-9]*/, '') || process.env.ELECTRON_VERSION || ''
  const args = []
  if (version) args.push(`--target=${version}`, `--dist-url=https://electronjs.org/headers`)
  process.chdir(nativeDir)
  run(`node-gyp rebuild ${args.join(' ')}`)
}

main()