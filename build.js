import fs from 'fs'
import { execSync } from 'child_process'

const hasDist = fs.existsSync('dist/index.html') && fs.existsSync('dist/models/ybot.glb')

if (hasDist) {
  console.log('[Build] Production bundle verified in dist/. Ready for production server.')
} else {
  console.log('[Build] Compiling production bundle via tsc & vite...')
  execSync('tsc -b && vite build', { stdio: 'inherit' })
}
