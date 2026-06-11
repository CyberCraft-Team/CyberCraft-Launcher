// =============================================
// Game Module — CyberCraft Launcher (Simplified)
// =============================================
const ManifestSync = {
  async fetchManifest(server) {
    UI.updateManifestStatus("syncing", "Sinxronlanmoqda...");
    try {
      const serverId = server.id;
      const manifest = await API.request(`/launcher/servers/${serverId}/manifest/`);
      AppState.manifest = manifest;
      UI.updateManifestStats(manifest);
      if (elements.playBtn) {
        elements.playBtn.querySelector(".play-text").textContent = "O'YINNI BOSHLASH";
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

    // Manifest dagi fayllarni category bilan birga yig'ish
    const allFiles = [
      ...(files.mods || []).map((f) => ({ ...f, category: "mods" })),
      ...(files.resourcepacks || []).map((f) => ({ ...f, category: "resourcepacks" })),
      ...(files.shaders || []).map((f) => ({ ...f, category: "shaders" })),
    ];

    if (allFiles.length === 0) {
      return { toDownload: [], toDelete: [], verified: 0 };
    }

    const toDownload = [];
    const toDelete = [];
    let verified = 0;

    try {
      // scanGameFolder() — parametrsiz, global scan
      // Qaytaradi: { mods: [{name, hash, size}], resourcepacks: [...], shaders: [...] }
      const existingFiles = await window.electronAPI.scanGameFolder();

      for (const file of allFiles) {
        const fileName = file.name || file.filename;
        const category = file.category;

        // Shu categorydagi mavjud fayllarni topish
        const categoryFiles = existingFiles[category] || [];
        const existingFile = categoryFiles.find((ef) => ef.name === fileName);

        if (!existingFile) {
          // Fayl yo'q — yuklab olish kerak
          toDownload.push(file);
        } else if (file.hash && existingFile.hash !== file.hash) {
          // Hash mos kelmaydi — qayta yuklab olish kerak
          toDownload.push(file);
        } else {
          verified++;
        }
      }

      // Manifestda yo'q lekin diskda bor fayllarni aniqlash (o'chirish uchun)
      const categories = ["mods", "resourcepacks", "shaders"];
      for (const category of categories) {
        const manifestFiles = (files[category] || []).map(
          (f) => f.name || f.filename,
        );
        const localFiles = existingFiles[category] || [];

        for (const localFile of localFiles) {
          if (!manifestFiles.includes(localFile.name)) {
            toDelete.push({ name: localFile.name, category: category });
          }
        }
      }
    } catch (error) {
      console.error("Sync files error:", error);
      UI.showNotification("Fayllarni tekshirishda xato yuz berdi", "warning");
      // Xatolik bo'lsa, hamma faylni yuklab olish kerak
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
    let hasErrors = false;

    // O'chirish
    for (const file of toDelete) {
      try {
        await window.electronAPI.deleteFile(file.category, file.name);
      } catch (err) {
        console.warn(`Failed to delete ${file.category}/${file.name}:`, err);
      }
      completed++;
      if (onProgress)
        onProgress(completed, total, `O'chirildi: ${file.name}`);
    }

    // Yuklab olish
    for (const file of toDownload) {
      const fileName = file.name || file.filename;
      const url = file.url || file.download_url;
      const hash = file.hash || "";

      if (!url) {
        console.warn(`No download URL for ${fileName}, skipping`);
        completed++;
        continue;
      }

      try {
        const result = await window.electronAPI.downloadFile(
          file.category,
          fileName,
          url,
          hash,
        );

        if (result && !result.success) {
          console.error(`Download failed for ${fileName}:`, result.error);
          UI.showNotification(
            `Yuklab olishda xato: ${fileName}`,
            "error",
          );
          hasErrors = true;
        }
      } catch (err) {
        console.error(`Failed to download ${fileName}:`, err);
        UI.showNotification(
          `Yuklab olishda xato: ${fileName}`,
          "error",
        );
        hasErrors = true;
      }
      completed++;
      if (onProgress)
        onProgress(completed, total, `Yuklandi: ${fileName}`);
    }

    if (hasErrors) {
      UI.updateManifestStatus("error", "Ba'zi fayllar yuklanmadi");
    } else {
      UI.updateManifestStatus("synced", "Sinxronlangan");
    }
    return !hasErrors;
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

    UI.showLoading("Fayllar sinxronlanmoqda...");
    try {
      const syncResults = await ManifestSync.syncFiles(AppState.manifest);

      if (syncResults.toDownload.length > 0 || syncResults.toDelete.length > 0) {
        const syncOk = await ManifestSync.executeSync(
          syncResults,
          (completed, total, detail) => {
            const percent = Math.round((completed / total) * 100);
            UI.updateProgress(percent, detail);
          },
        );

        if (!syncOk) {
          UI.showNotification(
            "Ba'zi fayllar sinxronlanmadi. O'yin ishga tushirilmoqda...",
            "warning",
          );
        }
      }

      UI.showLoading("O'yin ishga tushirilmoqda...");

      if (isElectron) {
        const launchOptions = {
          server: server,
          manifest: AppState.manifest,
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
        };

        const result = await window.electronAPI.launchGame(launchOptions);

        if (result && !result.success) {
          UI.hideLoading();
          if (result.javaError) {
            UI.showNotification(result.error, "error");
          } else {
            UI.showNotification(
              "O'yinni ishga tushirishda xato: " + result.error,
              "error",
            );
          }
          return;
        }

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
