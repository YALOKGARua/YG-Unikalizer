const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const rustDir = path.join(__dirname, '..', 'rust-native')
const targetNode = path.join(rustDir, 'index.node')
const destDir = path.join(__dirname, '..', 'dist', 'rust-native')

function buildRust() {
  console.log('🦀 Building Rust native module...')
  
  if (!fs.existsSync(rustDir)) {
    console.log('⚠️  Rust directory not found, skipping...')
    return
  }

  const cargoPath = process.platform === 'win32' ? 'cargo.exe' : 'cargo'
  
  try {
    execSync(cargoPath + ' --version', { stdio: 'ignore' })
  } catch {
    console.log('⚠️  Rust toolchain not installed, skipping...')
    console.log('   Install from: https://rustup.rs/')
    return
  }

  try {
    console.log('   Installing dependencies...')
    execSync('npm install', { cwd: rustDir, stdio: 'inherit' })
    
    console.log('   Compiling...')
    execSync('npm run build', { cwd: rustDir, stdio: 'inherit' })
    
    const nodeFiles = fs.readdirSync(rustDir).filter(f => f.endsWith('.node'))
    if (nodeFiles.length > 0) {
      const sourceNode = path.join(rustDir, nodeFiles[0])
      fs.copyFileSync(sourceNode, targetNode)
      console.log(`   Copied ${nodeFiles[0]} -> index.node`)
    }
    
    if (fs.existsSync(targetNode)) {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true })
      }
      const destNode = path.join(destDir, 'index.node')
      fs.copyFileSync(targetNode, destNode)
      console.log('✅ Rust module built successfully!')
    } else {
      console.log('⚠️  Build completed but .node file not found')
    }
  } catch (error) {
    console.error('❌ Failed to build Rust module:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  buildRust()
}

module.exports = { buildRust }