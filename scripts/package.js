const packager = require('electron-packager');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const STAGING = path.join(ROOT, '.staging');
const DIST = path.join(ROOT, 'dist');
const APP_NAME = 'CyberCraft Launcher';

console.log('Cleaning staging directory...');
if (fs.existsSync(STAGING)) {
  fs.rmSync(STAGING, { recursive: true, force: true });
}

console.log('Creating staging directory...');
const requiredDirs = ['out', 'utils'];
for (const dir of requiredDirs) {
  const src = path.join(ROOT, dir);
  const dest = path.join(STAGING, dir);
  if (!fs.existsSync(src)) {
    console.error(`FATAL: Required directory not found: ${src}`);
    process.exit(1);
  }
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log(`  Copied ${dir}/`);
}

const requiredFiles = ['main.js', 'preload.js', 'package.json'];
for (const file of requiredFiles) {
  const src = path.join(ROOT, file);
  const dest = path.join(STAGING, file);
  if (!fs.existsSync(src)) {
    console.error(`FATAL: Required file not found: ${src}`);
    process.exit(1);
  }
  fs.copyFileSync(src, dest);
  console.log(`  Copied ${file}`);
}

console.log('Installing production dependencies...');
const tempNpmrc = path.join(STAGING, '.temp-npmrc');
fs.writeFileSync(tempNpmrc, '');

const cleanEnv = { ...process.env };
for (const key of Object.keys(cleanEnv)) {
  if (key.startsWith('npm_config_')) {
    delete cleanEnv[key];
  }
}

execSync(`npm install --omit=dev --ignore-scripts --userconfig=${tempNpmrc}`, {
  cwd: STAGING,
  stdio: 'inherit',
  env: cleanEnv,
});
fs.rmSync(tempNpmrc, { force: true });

console.log('Removing unnecessary files from node_modules...');
function removeUnnecessary(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' && dir !== path.join(STAGING, 'node_modules')) {
        continue;
      }
      removeUnnecessary(fullPath);
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.map') || entry.name.endsWith('.d.ts')) {
        fs.rmSync(fullPath);
      }
      if (entry.name === 'CHANGELOG.md' || entry.name === 'changelog.md' ||
          entry.name === 'readme.md' || entry.name === 'README.md') {
        fs.rmSync(fullPath);
      }
    }
  }
}
removeUnnecessary(path.join(STAGING, 'node_modules'));

const options = {
  dir: STAGING,
  out: DIST,
  name: APP_NAME,
  platform: 'win32',
  arch: 'x64',
  electronVersion: '42.4.0',
  appVersion: require('../package.json').version,
  appCopyright: 'CyberCraft Network',
  win32metadata: {
    CompanyName: 'CyberCraft',
    FileDescription: 'CyberCraft Minecraft Launcher',
    OriginalFilename: 'CyberCraft Launcher.exe',
    ProductName: 'CyberCraft Launcher',
  },
  overwrite: true,
  asar: true,
  prune: false,
};

console.log('Packaging from staging directory...');
packager(options)
  .then((appPaths) => {
    console.log('Packaging complete!');
    console.log('App path:', appPaths.join(', '));

    const appDir = appPaths[0];
    if (appDir && fs.existsSync(appDir)) {
      const outDir = path.join(appDir, 'out');
      if (fs.existsSync(outDir)) {
        console.log('Frontend static files are present at:', outDir);
      } else {
        console.warn('Warning: frontend static files not found at', outDir);
      }
    }

    console.log('Cleaning staging directory...');
    fs.rmSync(STAGING, { recursive: true, force: true });
  })
  .catch((err) => {
    console.error('Packaging failed:', err);
    process.exit(1);
  });
