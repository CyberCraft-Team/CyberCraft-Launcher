import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface JavaInfo {
  path: string;
  version: number;
  vendor: string;
  isValid: boolean;
}

const JAVA_CANDIDATES = [
  'java',
  'java.exe',
];

const JAVA_HOME_CANDIDATES = [
  process.env.JAVA_HOME,
  process.env.JDK_HOME,
  // Windows common locations
  'C:\\Program Files\\Java',
  'C:\\Program Files (x86)\\Java',
  // Linux/macOS common locations
  '/usr/lib/jvm',
  '/usr/java',
  '/Library/Java/JavaVirtualMachines',
].filter(Boolean) as string[];

function parseJavaVersion(output: string): { version: number; vendor: string } {
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
  }

  return { version, vendor };
}

function checkJavaExecutable(javaPath: string): JavaInfo | null {
  try {
    const output = execSync(`"${javaPath}" -version`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
    });
    const { version, vendor } = parseJavaVersion(output);
    return {
      path: javaPath,
      version,
      vendor,
      isValid: version >= 8,
    };
  } catch {
    return null;
  }
}

function findJavaInDirectory(dir: string): JavaInfo[] {
  const results: JavaInfo[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subDir = path.join(dir, entry.name);
        const binDir = path.join(subDir, 'bin');
        if (fs.existsSync(binDir)) {
          for (const candidate of JAVA_CANDIDATES) {
            const javaPath = path.join(binDir, candidate);
            if (fs.existsSync(javaPath)) {
              const info = checkJavaExecutable(javaPath);
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

export function detectJava(): JavaInfo[] {
  const results: JavaInfo[] = [];

  for (const candidate of JAVA_CANDIDATES) {
    const info = checkJavaExecutable(candidate);
    if (info) results.push(info);
  }

  for (const javaHome of JAVA_HOME_CANDIDATES) {
    if (fs.existsSync(javaHome)) {
      const found = findJavaInDirectory(javaHome);
      results.push(...found);
    }
  }

  const unique = new Map<string, JavaInfo>();
  for (const info of results) {
    if (!unique.has(info.path) || unique.get(info.path)!.version < info.version) {
      unique.set(info.path, info);
    }
  }

  return Array.from(unique.values())
    .filter(info => info.isValid)
    .sort((a, b) => b.version - a.version);
}

export function getBestJava(preferVersion = 21): JavaInfo | null {
  const javas = detectJava();
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

export function validateJavaPath(javaPath: string): JavaInfo | null {
  return checkJavaExecutable(javaPath);
}