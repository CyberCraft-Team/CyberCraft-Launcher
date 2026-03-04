// =============================================
// Game Module — CyberCraft Launcher
// =============================================
const ManifestSync = {
  async fetchManifest(server) {
    UI.updateManifestStatus("syncing", "Sinxronlanmoqda...");
    try {
      const serverId = server.id;
      const manifest = await API.request(`/api/servers/${serverId}/manifest/`);
      AppState.manifest = manifest;
      UI.updateManifestStats(manifest);
      if (elements.playBtn) {
        elements.playBtn.querySelector(".play-text").textContent =
          "O'YINNI BOSHLASH";
        elements.playBtn.disabled = false;
      }
      return manifest;
    } catch (error) {
      console.error("fetchManifest error:", error);
      UI.updateManifestStatus("error", "Xatolik");
      if (elements.playBtn) {
        elements.playBtn.querySelector(".play-text").textContent = "XATO";
        elements.playBtn.disabled = true;
      }
      throw error;
    }
  },

  async syncFiles(manifest) {
    if (!isElectron) return { toDownload: [], toDelete: [], verified: 0 };

    const files = manifest.files || {};
    const allFiles = [
      ...(files.mods || []).map((f) => ({ ...f, type: "mods" })),
      ...(files.resourcepacks || []).map((f) => ({
        ...f,
        type: "resourcepacks",
      })),
      ...(files.shaders || []).map((f) => ({ ...f, type: "shaders" })),
      ...(files.config || []).map((f) => ({ ...f, type: "config" })),
    ];

    if (allFiles.length === 0) {
      return { toDownload: [], toDelete: [], verified: 0 };
    }

    const toDownload = [];
    const toDelete = [];
    let verified = 0;

    try {
      const existingFiles = await window.electronAPI.scanGameFolder(
        AppState.selectedServer.id,
      );

      for (const file of allFiles) {
        const relativePath = `${file.type}/${file.filename || file.name}`;
        const existingFile = existingFiles.find(
          (ef) => ef.path === relativePath,
        );

        if (!existingFile) {
          toDownload.push(file);
        } else if (file.hash || file.md5) {
          const localHash = await window.electronAPI.checkFileHash(
            AppState.selectedServer.id,
            relativePath,
          );
          if (localHash !== (file.hash || file.md5)) {
            toDownload.push(file);
          } else {
            verified++;
          }
        } else {
          verified++;
        }
      }

      // Fayllar ro'yxatida bo'lmagan fayllarni o'chirish (agar kerak bo'lsa)
      const manifestPaths = allFiles.map(
        (f) => `${f.type}/${f.filename || f.name}`,
      );
      for (const existing of existingFiles) {
        if (!manifestPaths.includes(existing.path)) {
          toDelete.push(existing);
        }
      }
    } catch (error) {
      console.error("Sync files error:", error);
      // Agar scan ishlamasa, barchasini yuklash
      return { toDownload: allFiles, toDelete: [], verified: 0 };
    }

    return { toDownload, toDelete, verified };
  },

  async executeSync(syncResults, onProgress) {
    const { toDownload, toDelete } = syncResults;
    const total = toDownload.length + toDelete.length;

    if (total === 0) {
      UI.updateManifestStatus("synced", "Hamma fayllar yangi");
      return true;
    }

    let completed = 0;

    // O'chirish
    for (const file of toDelete) {
      try {
        await window.electronAPI.deleteGameFile(
          AppState.selectedServer.id,
          file.path,
        );
      } catch (err) {
        console.warn(`Failed to delete ${file.path}:`, err);
      }
      completed++;
      if (onProgress) onProgress(completed, total, `O'chirildi: ${file.path}`);
    }

    // Yuklash
    for (const file of toDownload) {
      const relativePath = `${file.type}/${file.filename || file.name}`;
      const url = file.download_url || file.url;

      try {
        await window.electronAPI.downloadFile(
          url,
          AppState.selectedServer.id,
          relativePath,
        );
      } catch (err) {
        console.error(`Failed to download ${relativePath}:`, err);
        UI.showNotification(
          `Yuklab olishda xato: ${file.filename || file.name}`,
          "error",
        );
      }
      completed++;
      if (onProgress)
        onProgress(completed, total, `Yuklandi: ${file.filename || file.name}`);
    }

    UI.updateManifestStatus("synced", "Sinxronlangan");
    return true;
  },
};

const GameLauncher = {
  async launch(server) {
    if (!AppState.user || !AppState.token) {
      UI.showNotification("Avtorizatsiya qilinmagan", "error");
      return;
    }
    if (!AppState.manifest) {
      UI.showNotification("Manifest yuklanmagan. Kuting...", "error");
      return;
    }

    // Sync before launch
    UI.showLoading("Fayllar sinxronlanmoqda...");
    try {
      const syncResults = await ManifestSync.syncFiles(AppState.manifest);

      if (
        syncResults.toDownload.length > 0 ||
        syncResults.toDelete.length > 0
      ) {
        await ManifestSync.executeSync(
          syncResults,
          (completed, total, detail) => {
            const percent = Math.round((completed / total) * 100);
            UI.updateProgress(percent, detail);
          },
        );
      }

      UI.showLoading("O'yin ishga tushirilmoqda...");

      if (isElectron) {
        AppState.gameStartTime = Date.now();

        const launchOptions = {
          serverId: server.id,
          serverName: server.name,
          minecraftVersion: server.minecraft_version,
          forgeVersion: server.forge_version || null,
          neoforgeVersion: server.neoforge_version || null,
          ram: AppState.settings.ram,
          javaPath: AppState.settings.javaPath || "",
          username: AppState.user.username,
          uuid: AppState.user.uuid || AppState.user.id,
          token: AppState.token,
          jvmArgs: AppState.settings.jvmArgs || "",
          fullscreen: AppState.settings.fullscreen || false,
          gameResolution: AppState.settings.gameResolution || "1280x720",
        };

        await window.electronAPI.launchGame(launchOptions);

        if (AppState.settings.hideOnLaunch) {
          window.electronAPI.minimize();
        }
      } else {
        UI.showNotification("O'yin boshlandi! (Demo rejim)", "success");
      }
    } catch (error) {
      console.error("Game launch error:", error);
      UI.showNotification(
        "O'yinni ishga tushirishda xato: " + error.message,
        "error",
      );
    } finally {
      UI.hideLoading();
    }
  },

  async savePlaytime(serverId) {
    if (!isElectron || !AppState.gameStartTime) return;
    const durationSeconds = Math.floor(
      (Date.now() - AppState.gameStartTime) / 1000,
    );
    if (durationSeconds < 5) return;

    try {
      const currentSeconds = await window.electronAPI.getPlaytime(serverId);
      await window.electronAPI.savePlaytime(
        serverId,
        (currentSeconds || 0) + durationSeconds,
      );
      AppState.gameStartTime = null;
      UI.updatePlaytimeDisplay(serverId);
    } catch (error) {
      console.error("Failed to save playtime:", error);
    }
  },

  async showCrashReport(exitCode) {
    if (!isElectron || exitCode === 0) return;
    try {
      const logContent = await window.electronAPI.readCrashLog();
      if (elements.crashModal && elements.crashLogContent) {
        elements.crashLogContent.textContent =
          logContent ||
          `O'yin xato bilan yopildi.\nExit code: ${exitCode}\nLog topilmadi.`;
        elements.crashModal.classList.add("active");
      }
    } catch (error) {
      console.error("Failed to read crash log:", error);
    }
  },
};
