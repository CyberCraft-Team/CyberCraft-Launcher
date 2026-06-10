document.addEventListener("DOMContentLoaded", async () => {
  // Prevent double initialization
  if (window.__launcherInitialized) return;
  window.__launcherInitialized = true;

  if (typeof initEventListeners === "function") initEventListeners();

  // =============================================
  // Auto-Update Check (before login)
  // =============================================
  if (isElectron) {
    try {
      const updateInfo = await window.electronAPI.checkForUpdate();

      if (updateInfo && updateInfo.update_available) {
        const currentVersion = await window.electronAPI.getLauncherVersion();

        if (elements.updateCurrentVersion)
          elements.updateCurrentVersion.textContent = `v${currentVersion}`;
        if (elements.updateNewVersion)
          elements.updateNewVersion.textContent = `v${updateInfo.version}`;

        if (updateInfo.release_notes && elements.updateNotes) {
          elements.updateNotes.textContent = updateInfo.release_notes;
          elements.updateNotes.classList.add("has-content");
        }

        if (elements.updateStatus) {
          elements.updateStatus.textContent =
            "Davom etish uchun yangi versiyani yuklab oling.";
        }

        if (elements.updateOverlay) {
          elements.updateOverlay.classList.add("active");
        }

        if (elements.updateDownloadBtn) {
          elements.updateDownloadBtn.addEventListener("click", async () => {
            elements.updateDownloadBtn.disabled = true;
            elements.updateDownloadBtn.innerHTML = "Yuklanmoqda...";

            if (elements.updateProgressSection) {
              elements.updateProgressSection.style.display = "block";
            }
            if (elements.updateStatus) {
              elements.updateStatus.textContent = "Yuklab olinmoqda...";
            }

            window.electronAPI.onUpdateProgress((data) => {
              if (elements.updateProgressFill) {
                elements.updateProgressFill.style.width = `${data.percent}%`;
              }
              if (elements.updateProgressPercent) {
                elements.updateProgressPercent.textContent = `${data.percent}%`;
              }
              if (elements.updateProgressSize) {
                elements.updateProgressSize.textContent = `${data.downloadedMB} MB / ${data.totalMB} MB`;
              }
            });

            const result = await window.electronAPI.downloadUpdate(
              updateInfo.download_url,
            );

            if (result.success) {
              if (elements.updateStatus) {
                elements.updateStatus.textContent =
                  "Yuklab olindi! O'rnatish boshlanmoqda...";
              }
              elements.updateDownloadBtn.innerHTML = "O'rnatilmoqda...";

              setTimeout(async () => {
                await window.electronAPI.installUpdate(result.filePath);
              }, 1000);
            } else {
              if (elements.updateStatus) {
                elements.updateStatus.textContent = `Xato: ${result.error}`;
              }
              elements.updateDownloadBtn.disabled = false;
              elements.updateDownloadBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                </svg>
                Qayta urinish
              `;
            }
          });
        }

        if (updateInfo.force) {
          console.log("[CyberCraft] Forced update required, blocking launcher");
          return;
        }
      }
    } catch (err) {
      console.error("[CyberCraft] Update check error:", err);
    }
  }

  // =============================================
  // Normal initialization (login / main)
  // =============================================
  const hasSession = await Auth.checkSession();
  if (hasSession) {
    UI.showMain();
  } else {
    UI.showLogin();
  }

  if (isElectron) {
    // Load persistent settings
    const settings = await window.electronAPI.getSettings();
    if (settings) {
      AppState.settings = { ...AppState.settings, ...settings };
      if (elements.gameDir) elements.gameDir.value = settings.gameDir || "";
      if (elements.settingsRamSlider) {
        elements.settingsRamSlider.value = settings.ram || 4;
        if (elements.settingsRamValueMB)
          elements.settingsRamValueMB.textContent = `${(settings.ram || 4) * 1024} MB`;
      }
      UI.updateSettingsUI();
    }

    // IPC Listeners
    window.electronAPI.onLaunchProgress((data) => {
      const messages = {
        natives: "Native kutubxonalar yuklanmoqda...",
        classes: "Minecraft yuklanmoqda...",
        assets: "Resurslar yuklanmoqda...",
        libraries: "Kutubxonalar yuklanmoqda...",
      };
      const message = messages[data.type] || `${data.type} yuklanmoqda...`;
      UI.updateProgress(data.percent, message);
    });

    window.electronAPI.onDownloadStatus((data) => {
      UI.updateProgress(
        Math.round((data.current / data.total) * 100),
        `Yuklanmoqda: ${data.name}`,
      );
    });

    window.electronAPI.onGameClose(async (code) => {
      UI.hideLoading();
      if (code === 0) {
        UI.showNotification("O'yin yopildi", "info");
      } else {
        UI.showNotification(
          `O'yin xato bilan yopildi (kod: ${code})`,
          "warning",
        );
        GameLauncher.showCrashReport(code);
      }
    });

    window.electronAPI.onGameError((error) => {
      UI.hideLoading();
      UI.showNotification("O'yin xatosi: " + error, "error");
    });
  }
});
