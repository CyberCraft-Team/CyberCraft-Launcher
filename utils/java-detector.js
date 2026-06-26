const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const JAVA_CANDIDATES = ['java', 'java.exe'];

const JAVA_HOME_CANDIDATES = (function() {
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(process.env.JAVA_HOME);
  if (process.env.JDK_HOME) candidates.push(process.env.JDK_HOME);
  candidates.push('C:\\Program Files\\Java');
  candidates.push('C:\\Program Files (x86)\\Java');
  if (process.platform === 'linux' || process.platform === 'darwin') {
    candidates.push('/usr/lib/jvm');
    candidates.push('/usr/java');
    candidates.push('/Library/Java/JavaVirtualMachines');
  }
  return candidates;
})();

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function parseJavaVersion(output) {
  const lines = output.split('\n');
  let version = 0;
  let vendor = 'Unknown';

  for (const line of lines) {
    if (line.includes('version')) {
      const match = line.match(/version\s+"(\d+)(?:\.(\d+))?/);
      if (match) {
        version = parseInt(match[1], 10);
        if (match[2] && version === 1) {
          version = parseInt(match[2], 10);
        }
      }
    }
    if (line.toLowerCase().includes('openjdk')) vendor = 'OpenJDK';
    else if (line.toLowerCase().includes('oracle')) vendor = 'Oracle';
    else if (line.toLowerCase().includes('eclipse')) vendor = 'Eclipse Temurin';
    else if (line.toLowerCase().includes('azul')) vendor = 'Azul Zulu';
    else if (line.toLowerCase().includes('amazon')) vendor = 'Amazon Corretto';
    else if (line.toLowerCase().includes('microsoft')) vendor = 'Microsoft';
  }

  return { version, vendor };
}

function checkJavaExecutable(javaPath) {
  return new Promise((resolve) => {
    exec(`"${javaPath}" -version`, { timeout: 5000 }, (error, stdout, stderr) => {
      const output = (stdout || '') + (stderr || '');
      if (error && !output) {
        resolve(null);
        return;
      }
      const { version, vendor } = parseJavaVersion(output);
      resolve({ path: javaPath, version, vendor, isValid: version >= 8 });
    });
  });
}

async function findJavaInDirectory(dir) {
  const results = [];
  try {
    // 1. Check if the directory itself contains bin/java
    const binDir = path.join(dir, 'bin');
    if (await exists(binDir)) {
      for (const candidate of JAVA_CANDIDATES) {
        const javaPath = path.join(binDir, candidate);
        if (await exists(javaPath)) {
          const info = await checkJavaExecutable(javaPath);
          if (info) results.push(info);
        }
      }
    }

    // 2. Check all subdirectories of dir (excluding bin directory itself)
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.toLowerCase() !== 'bin') {
        const subDir = path.join(dir, entry.name);
        const subBinDir = path.join(subDir, 'bin');
        if (await exists(subBinDir)) {
          for (const candidate of JAVA_CANDIDATES) {
            const javaPath = path.join(subBinDir, candidate);
            if (await exists(javaPath)) {
              const info = await checkJavaExecutable(javaPath);
              if (info) results.push(info);
            }
          }
        }
      }
    }
  } catch {
    // Ignore directory read errors
  }
  return results;
}

async function detectJava() {
  const results = [];

  for (const candidate of JAVA_CANDIDATES) {
    const info = await checkJavaExecutable(candidate);
    if (info) results.push(info);
  }

  for (const javaHome of JAVA_HOME_CANDIDATES) {
    if (javaHome && await exists(javaHome)) {
      const found = await findJavaInDirectory(javaHome);
      results.push(...found);
    }
  }

  const unique = new Map();
  for (const info of results) {
    if (!unique.has(info.path) || unique.get(info.path).version < info.version) {
      unique.set(info.path, info);
    }
  }

  return Array.from(unique.values())
    .filter(info => info.isValid)
    .sort((a, b) => b.version - a.version);
}

async function getBestJava(preferVersion) {
  if (preferVersion === undefined) preferVersion = 21;
  const javas = await detectJava();
  if (javas.length === 0) return null;

  const preferred = javas.find(j => j.version === preferVersion);
  if (preferred) return preferred;
  const fallback21 = javas.find(j => j.version === 21);
  if (fallback21) return fallback21;
  const fallback17 = javas.find(j => j.version === 17);
  if (fallback17) return fallback17;
  const fallback8 = javas.find(j => j.version === 8);
  if (fallback8) return fallback8;
  return javas[0];
}

async function validateJavaPath(javaPath) {
  return await checkJavaExecutable(javaPath);
}

module.exports = { detectJava, getBestJava, validateJavaPath };
