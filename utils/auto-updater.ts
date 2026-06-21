import { autoUpdater, UpdateInfo } from 'electron-updater';
import { app, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { getApiBaseUrl, apiRequest } from '../main';

export interface UpdateCheckResult {
  updateAvailable: boolean;
  version?: string;
  downloadUrl?: string;
  releaseNotes?: string;
  force?: boolean;
  fileSize?: number;
  source?: 'backend' | 'github';
}

let updateCheckInProgress = false;
let pendingUpdate: UpdateInfo | null = null;

export function initAutoUpdater(mainWindow: BrowserWindow | null): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log('[Updater] Update available:', info.version);
    pendingUpdate = info;
    mainWindow?.webContents.send('updater:update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
      fileSize: info.files?.[0]?.size || 0,
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] No update available');
    mainWindow?.webContents.send('updater:update-not-available');
  });

  autoUpdater.on('error', (err: Error) => {
    console.error('[Updater] Error:', err.message);
    mainWindow?.webContents.send('updater:error', err.message);
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('updater:download-progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log('[Updater] Update downloaded:', info.version);
    mainWindow?.webContents.send('updater:update-downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });
}

export async function checkForUpdates(force = false): Promise<UpdateCheckResult> {
  if (updateCheckInProgress && !force) {
    return { updateAvailable: false };
  }

  updateCheckInProgress = true;

  try {
    // Try backend first
    const backendResult = await checkBackendUpdates();
    if (backendResult.updateAvailable) {
      await configureUpdaterForBackend(backendResult);
      return backendResult;
    }

    // Fallback to GitHub
    const githubResult = await checkGitHubUpdates();
    return githubResult;
  } catch (error) {
    console.error('[Updater] Check failed:', error);
    return { updateAvailable: false };
  } finally {
    updateCheckInProgress = false;
  }
}

async function checkBackendUpdates(): Promise<UpdateCheckResult> {
  try {
    const baseUrl = await getApiBaseUrl();
    const version = app.getVersion();
    const platform = process.platform;

    const result = await apiRequest(`/launcher/update/?version=${encodeURIComponent(version)}&platform=${encodeURIComponent(platform)}`);
    
    if (result.update_available) {
      return {
        updateAvailable: true,
        version: result.version,
        downloadUrl: result.download_url,
        releaseNotes: result.release_notes,
        force: result.force,
        fileSize: result.file_size,
        source: 'backend',
      };
    }
  } catch (error) {
    console.log('[Updater] Backend check failed:', error);
  }
  return { updateAvailable: false };
}

async function checkGitHubUpdates(): Promise<UpdateCheckResult> {
  try {
    // electron-updater will handle GitHub automatically if configured
    const result = await autoUpdater.checkForUpdates();
    if (result.updateInfo) {
      return {
        updateAvailable: true,
        version: result.updateInfo.version,
        releaseNotes: result.updateInfo.releaseNotes,
        source: 'github',
      };
    }
  } catch (error) {
    console.log('[Updater] GitHub check failed:', error);
  }
  return { updateAvailable: false };
}

async function configureUpdaterForBackend(result: UpdateCheckResult): Promise<void> {
  // Custom download URL for backend updates
  autoUpdater.updateConfigPath = path.join(__dirname, '..', '..', 'app-update.yml');
  
  // Write temporary update config
  const config = {
    provider: 'generic',
    url: result.downloadUrl,
    channel: 'latest',
  };
  
  fs.writeFileSync(autoUpdater.updateConfigPath, JSON.stringify(config));
}

export async function downloadUpdate(): Promise<void> {
  if (pendingUpdate) {
    await autoUpdater.downloadUpdate();
  }
}

export async function installUpdate(): Promise<void> {
  autoUpdater.quitAndInstall(false, true);
}

export function getPendingUpdate(): UpdateInfo | null {
  return pendingUpdate;
}