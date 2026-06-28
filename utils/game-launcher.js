const path = require('path');
const fs = require('fs');
const { app } = require('electron');

function createGameDirectory(manifest, customBasePath) {
  const gameDir = path.join(customBasePath || path.join(app.getPath('userData'), 'CyberCraft', 'game'), manifest.id || 'default');
  const versionDir = path.join(gameDir, 'versions', manifest.id || 'default');

  fs.mkdirSync(versionDir, { recursive: true });
  fs.mkdirSync(path.join(gameDir, 'libraries'), { recursive: true });
  fs.mkdirSync(path.join(gameDir, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(gameDir, 'natives'), { recursive: true });

  return gameDir;
}

function buildJavaCommand(javaInfo, options) {
  const {
    ram = 4,
    jvmArgs = '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200',
    username = 'Player',
    uuid = '00000000-0000-0000-0000-000000000000',
    accessToken = '0',
    serverAddress = '127.0.0.1:25565',
    gameDir = '',
    version = '1.21.4',
    loader = 'vanilla',
  } = options;

  const classpath = path.join(gameDir, 'libraries', '*')

  const javaArgs = [
    `-Xms${ram}G`,
    `-Xmx${ram}G`,
    ...jvmArgs.split(' ').filter(a => a.trim()),
    '-Djava.library.path=' + path.join(gameDir, 'natives'),
    '-cp', classpath,
    'net.minecraft.client.main.Main',
    '--username', username,
    '--version', `CyberCraft-${version}-${loader}`,
    '--gameDir', gameDir,
    '--assetsDir', path.join(gameDir, 'assets'),
    '--assetIndex', version,
    '--uuid', uuid.replace(/-/g, ''),
    '--accessToken', accessToken,
    '--userType', 'msa',
    '--versionType', 'CyberCraft',
  ];

  const [host, portStr] = serverAddress.split(':');
  if (host) {
    javaArgs.push('--server', host);
    if (portStr) javaArgs.push('--port', portStr);
  }

  return javaArgs;
}

module.exports = { createGameDirectory, buildJavaCommand };
