const esbuild = require('esbuild')
const path = require('path')
const fs = require('fs')

async function build() {
  const preloadTs = path.resolve(__dirname, '..', 'electron', 'preload.ts')
  const mainTs = path.resolve(__dirname, '..', 'electron', 'main.ts')
  const tasks = []
  if (fs.existsSync(preloadTs)) {
    tasks.push(esbuild.build({
      entryPoints: [preloadTs],
      outfile: path.resolve(__dirname, '..', 'electron', 'preload.js'),
      platform: 'node',
      format: 'cjs',
      bundle: true,
      target: ['node18'],
      sourcemap: process.env.NODE_ENV === 'development',
      external: ['sharp', 'node-gyp-build', 'photounikalizer_native', 'electron']
    }))
  }
  if (fs.existsSync(mainTs)) {
    tasks.push(esbuild.build({
      entryPoints: [mainTs],
      outfile: path.resolve(__dirname, '..', 'electron', 'main.js'),
      platform: 'node',
      format: 'cjs',
      bundle: true,
      target: ['node18'],
      sourcemap: process.env.NODE_ENV === 'development',
      external: ['sharp', 'node-gyp-build', 'photounikalizer_native', 'electron', 'ws']
    }))
  }
  await Promise.all(tasks)
}

build().catch((e) => { console.error(e); process.exit(1) })