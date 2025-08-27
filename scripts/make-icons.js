const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const pngToIco = require('png-to-ico')

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true })
}

async function main() {
  const root = process.cwd()
  const svgPath = path.join(root, 'build', 'icon.svg')
  const outDir = path.join(root, 'build', 'icons')
  const icoPath = path.join(root, 'build', 'icon.ico')
  const sizes = [16, 24, 32, 48, 64, 128, 256]

  if (!fs.existsSync(svgPath)) {
    throw new Error('build/icon.svg not found')
  }
  await ensureDir(outDir)

  const pngBuffers = []
  for (const size of sizes) {
    const buf = await sharp(svgPath)
      .resize(size, size, { fit: 'contain', background: { r: 17, g: 24, b: 39, alpha: 1 } })
      .png({ compressionLevel: 9 })
      .toBuffer()
    pngBuffers.push(buf)
    const file = path.join(outDir, `icon-${size}.png`)
    await fs.promises.writeFile(file, buf)
  }

  const ico = await pngToIco(pngBuffers)
  await fs.promises.writeFile(icoPath, ico)
  process.stdout.write(`ICO written: ${icoPath}\n`)
}

main().catch(err => {
  process.stderr.write(String(err && err.message ? err.message : err) + '\n')
  process.exit(1)
})