import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { JavaInfo } from './java-detector';
import { app } from 'electron';

export interface Manifest {
  id: string;
  name: string;
  address: string;
  minecraft: string;
  loader: string;
  loaderVersion: string | null;
  version: string;
  files: {
    mods: Array<{ name: string; hash: string; size: number; required: boolean; url: string | null }>;
    resourcepacks: any[];
    shaders: any[];
  };
  forbidden: string[];
}

export interface GameProfile {
  gameDir: string;
  versionDir: string;
  versionJson: any;
  libraries: string[];
  mainClass: string;
  args: string[];
}

export interface LaunchOptions {
  manifest: Manifest;
  javaInfo: JavaInfo;
  ram: number;
  jvmArgs: string;
  serverAddress: string;
  username: string;
  uuid: string;
  accessToken: string;
  gameDir?: string;
  version?: string;
  loader?: string;
}

function createVersionJson(manifest: Manifest, javaInfo: JavaInfo): any {
  const version = manifest.minecraft;
  const loader = manifest.loader.toLowerCase();
  const loaderVersion = manifest.loaderVersion;

  const inheritsFrom = `${version}`;

  let libraries: any[] = [];

  if (loader === 'fabric' && loaderVersion) {
    libraries.push({
      name: `net.fabricmc:fabric-loader:${loaderVersion}`,
      url: 'https://maven.fabricmc.net/'
    });
    libraries.push({
      name: `net.fabricmc.fabric-api:fabric-api:${loaderVersion}`,
      url: 'https://maven.fabricmc.net/'
    });
  } else if (loader === 'forge' && loaderVersion) {
    libraries.push({
      name: `net.minecraftforge:forge:${version}-${loaderVersion}`,
      url: 'https://maven.minecraftforge.net/'
    });
  } else if (loader === 'neoforge' && loaderVersion) {
    libraries.push({
      name: `net.neoforged:neoforge:${version}-${loaderVersion}`,
      url: 'https://maven.neoforged.net/'
    });
  } else if (loader === 'quilt' && loaderVersion) {
    libraries.push({
      name: `org.quiltmc:quilt-loader:${loaderVersion}`,
      url: 'https://maven.quiltmc.org/'
    });
  }

  return {
    id: `CyberCraft/${manifest.name}/${version}/${loader}${loaderVersion ? '-' + loaderVersion : ''}`,
    inheritsFrom,
    libraries,
    mainClass: 'net.minecraft.client.main.Main',
    minimumLauncherVersion: 21,
  };
}

function buildClasspath(profile: GameProfile): string {
  return profile.libraries.join(path.delimiter);
}

function buildGameArgs(profile: GameProfile, options: LaunchOptions): string[] {
  const [host, portStr] = options.serverAddress.split(':');
  const port = portStr ? parseInt(portStr, 10) : 25565;
  const version = options.version || options.manifest.minecraft;
  const loader = options.loader || options.manifest.loader;

  return [
    '--username', options.username,
    '--version', profile.versionJson.id,
    '--gameDir', options.gameDir || profile.gameDir,
    '--assetsDir', path.join(options.gameDir || profile.gameDir, 'assets'),
    '--assetIndex', version,
    '--uuid', options.uuid.replace(/-/g, ''),
    '--accessToken', options.accessToken,
    '--userType', 'msa',
    '--versionType', 'CyberCraft',
    '--launchTarget', loader === 'forge' || loader === 'neoforge' ? 'fmlclient' : 'client',
    ...(loader === 'forge' || loader === 'neoforge' ? [
      '--fml.forgeVersion', '47.2.0',
      '--fml.mcVersion', version,
      '--fml.forgeGroup', 'net.minecraftforge',
    ] : []),
    '--server', host,
    '--port', port.toString(),
  ];
}

export async function createProfile(manifest: Manifest, javaInfo: JavaInfo, ram: number): Promise<GameProfile> {
  const gameDir = path.join(app.getPath('userData'), 'CyberCraft', 'game', manifest.id);
  const versionDir = path.join(gameDir, 'versions', manifest.id);

  fs.mkdirSync(versionDir, { recursive: true });
  fs.mkdirSync(path.join(gameDir, 'libraries'), { recursive: true });
  fs.mkdirSync(path.join(gameDir, 'assets'), { recursive: true });

  const versionJson = createVersionJson(manifest, javaInfo);
  const versionJsonPath = path.join(versionDir, `${manifest.id}.json`);
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2));

  const libraries: string[] = [];
  for (const lib of versionJson.libraries) {
    const parts = lib.name.split(':');
    if (parts.length >= 3) {
      const [group, artifact, version] = parts;
      const groupPath = group.replace(/\./g, path.sep);
      const jarName = `${artifact}-${version}.jar`;
      const jarFilePath = path.join(gameDir, 'libraries', groupPath, artifact, version, jarName);
      if (fs.existsSync(jarFilePath)) {
        libraries.push(jarFilePath);
      }
    }
  }

  return {
    gameDir,
    versionDir,
    versionJson,
    libraries,
    mainClass: versionJson.mainClass,
    args: [],
  };
}

export async function downloadLibraries(profile: GameProfile, manifest: Manifest, onProgress?: (progress: number, message: string) => void): Promise<void> {
  // TODO: Implement library downloading from Maven repositories
  // For now, assume libraries are available or will be downloaded by Minecraft
}

export async function launchGame(options: LaunchOptions, onLog: (line: string) => void, onExit: (code: number | null) => void): Promise<ChildProcess> {
  const profile = await createProfile(options.manifest, options.javaInfo, options.ram);
  
  const classpath = buildClasspath(profile);
  const gameArgs = buildGameArgs(profile, options);

  const javaArgs = [
    `-Xms${options.ram}G`,
    `-Xmx${options.ram}G`,
    ...options.jvmArgs.split(' ').filter(a => a.trim()),
    '-Djava.library.path=' + path.join(profile.gameDir, 'natives'),
    '-cp', classpath,
    profile.mainClass,
    ...gameArgs,
  ];

  const javaPath = options.javaInfo.path;
  const child = spawn(javaPath, javaArgs, {
    cwd: profile.gameDir,
    env: { ...process.env, JAVA_HOME: path.dirname(path.dirname(javaPath)) },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) onLog(line.trim());
    }
  });

  child.stderr?.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) onLog(`[STDERR] ${line.trim()}`);
    }
  });

  child.on('close', (code) => {
    onExit(code);
  });

  child.on('error', (err) => {
    onLog(`[ERROR] ${err.message}`);
    onExit(null);
  });

  return child;
}