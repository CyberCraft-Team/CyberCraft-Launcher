const { autoUpdater } = require('electron-updater');
const { app, BrowserWindow } = require('electron');

let updateCheckInProgress = false;
let pendingUpdate = null;

function initAutoUpdater(mainWindow) {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version);
    pendingUpdate = info;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:update-available', {
        version: info.version,
        releaseNotes: String(info.releaseNotes || ''),
        releaseDate: String(info.releaseDate || ''),
        fileSize: info.files && info.files[0] ? info.files[0].size : 0,
      });
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] No update available');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:update-not-available');
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err.message);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:error', err.message);
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:download-progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:update-downloaded', {
        version: info.version,
        releaseNotes: String(info.releaseNotes || ''),
      });
    }
  });
}

async function checkForUpdates() {
  if (updateCheckInProgress) return { updateAvailable: false };
  updateCheckInProgress = true;

  try {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo) {
      return {
        updateAvailable: true,
        version: result.updateInfo.version,
        releaseNotes: String(result.updateInfo.releaseNotes || ''),
        source: 'github',
      };
    }
  } catch (error) {
    console.log('[Updater] Check failed:', error.message);
  } finally {
    updateCheckInProgress = false;
  }
  return { updateAvailable: false };
}

async function downloadUpdate() {
  if (pendingUpdate) {
    await autoUpdater.downloadUpdate();
  }
}

function installUpdate() {
  autoUpdater.quitAndInstall(false, true);
}

function getPendingUpdate() {
  return pendingUpdate;
}

module.exports = { initAutoUpdater, checkForUpdates, downloadUpdate, installUpdate, getPendingUpdate };
