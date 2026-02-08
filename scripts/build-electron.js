// Build electron TypeScript files to dist-electron/
const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
console.log('🔨 Building Electron main process...');

try {
  execSync('npx tsc -p tsconfig.electron.json', {
    cwd: root,
    stdio: 'inherit',
  });
  console.log('✅ Electron build complete → dist-electron/');
} catch (e) {
  console.error('❌ Electron build failed');
  process.exit(1);
}
