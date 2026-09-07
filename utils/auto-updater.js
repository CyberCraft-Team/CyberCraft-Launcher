const { autoUpdater } = require('electron-updater');
const { app } = require('electron');

// How long to wait after the window appears before the first check, and how
// often to look again afterwards. The delay keeps the update request out of
// the way of session restore and the server list, which the user is actually
// waiting on; six hours is often enough for a launcher someone leaves open
// all evening without turning into a poll.
const FIRST_CHECK_DELAY_MS = 15 * 1000;
const RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

// The renderer also asks for a check when the session mounts, so the first
// scheduled check can land seconds behind an identical one. Anything inside
// this window is answered from the last result instead of hitting GitHub
// again.
const CHECK_COALESCE_MS = 60 * 1000;

let updateCheckInProgress = false;
let lastCheckAt = 0;
let lastCheckResult = { updateAvailable: false };
let pendingUpdate = null;
let downloadStarted = false;
let updateDownloaded = false;
let recheckTimer = null;
let firstCheckTimer = null;
let listenersBound = false;

/**
 * electron-updater only has a real feed when the app is packaged: an
 * unpacked run has no app-update.yml, so every check ends in the "not
 * packed" warning. Scheduling checks there would just be noise.
 */
function updatesSupported() {
  return app.isPackaged;
}

function send(mainWindow, channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function initAutoUpdater(mainWindow) {
  // The update is fetched as soon as one is found, and electron-updater
  // swaps it in when the app quits. So a user who never touches the banner
  // still ends up on the new version the next time they open the launcher --
  // which is the point of an automatic update.
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // A window recreated on macOS 'activate' would otherwise bind a second
  // copy of every handler and fire each renderer message twice.
  if (!listenersBound) {
    bindListeners(mainWindow);
    listenersBound = true;
  }

  if (!updatesSupported()) {
    console.log('[Updater] Skipping scheduled checks: app is not packaged');
    return;
  }

  scheduleChecks();
}

function bindListeners(mainWindow) {
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version);
    pendingUpdate = info;
    downloadStarted = autoUpdater.autoDownload;
    send(mainWindow, 'updater:update-available', {
      version: info.version,
      releaseNotes: String(info.releaseNotes || ''),
      releaseDate: String(info.releaseDate || ''),
      fileSize: info.files && info.files[0] ? info.files[0].size : 0,
      autoDownloading: autoUpdater.autoDownload,
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] No update available');
    send(mainWindow, 'updater:update-not-available');
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err.message);
    // A failed download must not leave the state latched, or the retry the
    // banner offers would be refused by the in-progress guard for ever.
    downloadStarted = false;
    send(mainWindow, 'updater:error', err.message);
  });

  autoUpdater.on('download-progress', (progress) => {
    send(mainWindow, 'updater:download-progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version);
    updateDownloaded = true;
    // Nothing further to look for once the installer is on disk; another
    // check would only re-download the same build.
    stopChecks();
    send(mainWindow, 'updater:update-downloaded', {
      version: info.version,
      releaseNotes: String(info.releaseNotes || ''),
    });
  });
}

function scheduleChecks() {
  stopChecks();

  firstCheckTimer = setTimeout(() => {
    checkForUpdates();
    recheckTimer = setInterval(checkForUpdates, RECHECK_INTERVAL_MS);
  }, FIRST_CHECK_DELAY_MS);

  // Timers hold the event loop open; without this a quit during the window
  // between launch and the first check would hang.
  if (firstCheckTimer.unref) firstCheckTimer.unref();
}

function stopChecks() {
  if (firstCheckTimer) {
    clearTimeout(firstCheckTimer);
    firstCheckTimer = null;
  }
  if (recheckTimer) {
    clearInterval(recheckTimer);
    recheckTimer = null;
  }
}

async function checkForUpdates() {
  if (updateCheckInProgress || updateDownloaded) {
    return { updateAvailable: updateDownloaded, downloaded: updateDownloaded };
  }
  if (!updatesSupported()) {
    return { updateAvailable: false, reason: 'not-packaged' };
  }
  if (Date.now() - lastCheckAt < CHECK_COALESCE_MS) {
    return lastCheckResult;
  }

  updateCheckInProgress = true;
  try {
    const result = await autoUpdater.checkForUpdates();
    lastCheckAt = Date.now();
    // The result carries updateInfo describing the *latest published* build
    // whether or not it is newer than what is running, so the presence of
    // updateInfo says nothing. isUpdateAvailable is the actual answer -- the
    // old test on updateInfo alone reported an update every single time.
    if (result && result.isUpdateAvailable) {
      lastCheckResult = {
        updateAvailable: true,
        version: result.updateInfo.version,
        releaseNotes: String(result.updateInfo.releaseNotes || ''),
        source: 'github',
      };
      return lastCheckResult;
    }
  } catch (error) {
    console.log('[Updater] Check failed:', error.message);
    // A failed check is not a result worth serving to the next caller, so
    // the coalescing timestamp stays where it was and a retry can go out.
    return { updateAvailable: false, error: error.message };
  } finally {
    updateCheckInProgress = false;
  }
  lastCheckResult = { updateAvailable: false };
  return lastCheckResult;
}

async function downloadUpdate() {
  if (!pendingUpdate || downloadStarted || updateDownloaded) return;
  downloadStarted = true;
  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    downloadStarted = false;
    throw error;
  }
}

function installUpdate() {
  autoUpdater.quitAndInstall(false, true);
}

function getPendingUpdate() {
  return pendingUpdate;
}

module.exports = {
  initAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  getPendingUpdate,
  stopChecks,
};
