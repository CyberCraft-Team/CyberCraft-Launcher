// =============================================
// Settings & Event Listeners — CyberCraft Launcher
// =============================================
function initEventListeners() {
  // ======= Navigation =======
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      const targetPage = item.dataset.page;
      if (!targetPage) return;

      document
        .querySelectorAll(".nav-item")
        .forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");

      document.querySelectorAll(".main-content .page").forEach((page) => {
        page.classList.remove("active");
        if (page.id === targetPage) page.classList.add("active");
      });

      // News sahifasi ochilganda
      if (targetPage === "news") {
        UI.renderNewsList();
      }
    });
  });

  // ======= Window Controls =======
  document.getElementById("minimizeBtn")?.addEventListener("click", () => {
    if (isElectron) window.electronAPI.minimize();
  });
  document.getElementById("maximizeBtn")?.addEventListener("click", () => {
    if (isElectron) window.electronAPI.maximize();
  });
  document.getElementById("closeBtn")?.addEventListener("click", () => {
    if (isElectron) window.electronAPI.close();
  });

  // ======= Login =======
  if (elements.loginForm) {
    elements.loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = elements.usernameInput?.value.trim();
      const password = elements.passwordInput?.value;
      if (!username || !password) {
        if (elements.loginError)
          elements.loginError.textContent = "Barcha maydonlarni to'ldiring";
        return;
      }

      if (elements.loginBtn) {
        elements.loginBtn.classList.add("loading");
        elements.loginBtn.disabled = true;
      }

      try {
        await Auth.login(username, password);
        UI.showMain();
        UI.updateSettingsUI();
      } catch (error) {
        if (elements.loginError)
          elements.loginError.textContent = error.message;
      } finally {
        if (elements.loginBtn) {
          elements.loginBtn.classList.remove("loading");
          elements.loginBtn.disabled = false;
        }
      }
    });
  }

  // ======= Logout =======
  elements.logoutBtn?.addEventListener("click", () => Auth.logout());
  elements.logoutSettings?.addEventListener("click", () => {
    UI.showConfirmDialog(
      "Hisobdan chiqish",
      "Hisobingizdan chiqishni tasdiqlaysizmi?",
      () => Auth.logout(),
      true,
    );
  });

  // ======= Server Selection =======
  elements.serverSelect?.addEventListener("change", (e) => {
    if (e.target.value) UI.selectServer(e.target.value);
  });

  // Server card click delegation
  if (elements.serversList) {
    elements.serversList.addEventListener("click", (e) => {
      const btn = e.target.closest(".select-btn");
      if (btn && !btn.disabled) {
        const card = btn.closest(".server-card");
        if (card) UI.selectServer(card.dataset.serverId);
      }
    });
  }

  // ======= Play Button =======
  elements.playBtn?.addEventListener("click", async () => {
    if (!AppState.selectedServer) {
      UI.showNotification("Server tanlanmagan!", "error");
      return;
    }
    try {
      await GameLauncher.launch(AppState.selectedServer);
    } catch (err) {
      console.error("Launch error:", err);
    }
  });

  // ======= News Click Handlers =======
  if (elements.newsGrid) {
    elements.newsGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".news-card");
      if (card) UI.showNewsModal(card.dataset.newsId);
    });
  }
  if (elements.newsListFull) {
    elements.newsListFull.addEventListener("click", (e) => {
      const item = e.target.closest(".news-list-item");
      if (item) UI.showNewsModal(item.dataset.newsId);
    });
  }

  elements.newsModalClose?.addEventListener("click", () => UI.hideNewsModal());
  if (elements.newsModal) {
    elements.newsModal.addEventListener("click", (e) => {
      if (e.target === elements.newsModal) UI.hideNewsModal();
    });
  }

  // News filter
  document.querySelectorAll(".news-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".news-filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      AppState.newsFilter = btn.dataset.filter || "all";
      UI.renderNewsList();
    });
  });

  // ======= Changelog =======
  document.getElementById("showChangelog")?.addEventListener("click", () => {
    UI.showChangelog();
  });

  // ======= Settings — RAM =======
  elements.settingsRamSlider?.addEventListener("input", (e) => {
    AppState.settings.ram = parseInt(e.target.value);
    if (elements.settingsRamValue)
      elements.settingsRamValue.textContent = `${e.target.value} GB`;
  });
  elements.settingsRamSlider?.addEventListener("change", () =>
    UI.saveSettings(),
  );

  // ======= Settings — JVM Args =======
  elements.jvmArgs?.addEventListener("change", (e) => {
    AppState.settings.jvmArgs = e.target.value;
    UI.saveSettings();
  });

  // ======= Settings — Hide On Launch =======
  elements.hideOnLaunch?.addEventListener("change", (e) => {
    AppState.settings.hideOnLaunch = e.target.checked;
    UI.saveSettings();
  });

  // ======= Settings — Start with Windows =======
  elements.startWithWindows?.addEventListener("change", (e) => {
    AppState.settings.startWithWindows = e.target.checked;
    UI.saveSettings();
  });

  // ======= Settings — Auto Check Updates =======
  elements.autoCheckUpdates?.addEventListener("change", (e) => {
    AppState.settings.autoCheckUpdates = e.target.checked;
    UI.saveSettings();
  });

  // ======= Settings — Discord RPC =======
  elements.discordRPC?.addEventListener("change", (e) => {
    AppState.settings.discordRPC = e.target.checked;
    UI.saveSettings();
  });

  // ======= Settings — Fullscreen =======
  elements.fullscreen?.addEventListener("change", (e) => {
    AppState.settings.fullscreen = e.target.checked;
    UI.saveSettings();
  });

  // ======= Settings — Game Resolution =======
  elements.gameResolution?.addEventListener("change", (e) => {
    AppState.settings.gameResolution = e.target.value;
    UI.saveSettings();
  });

  // ======= Settings — Save Logs =======
  elements.saveLogs?.addEventListener("change", (e) => {
    AppState.settings.saveLogs = e.target.checked;
    UI.saveSettings();
  });

  // ======= Settings — Browse Java =======
  elements.browseJava?.addEventListener("click", async () => {
    if (!isElectron) return;
    try {
      const result = await window.electronAPI.openFileDialog({
        title: "Java dasturini tanlang",
        properties: ["openFile"],
        filters: [
          { name: "Java", extensions: ["exe"] },
          { name: "Barcha fayllar", extensions: ["*"] },
        ],
      });
      if (result && result.filePaths && result.filePaths[0]) {
        if (elements.javaPath) elements.javaPath.value = result.filePaths[0];
        AppState.settings.javaPath = result.filePaths[0];
        UI.saveSettings();
        UI.showNotification("Java yo'li saqlandi", "success");
      }
    } catch (error) {
      console.error("Browse Java error:", error);
    }
  });

  // ======= Settings — Open Game Dir =======
  elements.openGameDir?.addEventListener("click", () => {
    if (isElectron) window.electronAPI.openGameDir(AppState.selectedServer?.id);
  });

  // ======= Settings — Open Logs =======
  elements.openLogs?.addEventListener("click", () => {
    if (isElectron) window.electronAPI.openLogsFolder();
  });

  // ======= Settings — Clear Cache =======
  elements.clearCache?.addEventListener("click", () => {
    UI.showConfirmDialog(
      "Keshni tozalash",
      "Keshni tozalash barcha yuklab olingan fayllarni o'chiradi. Davom etishni xohlaysizmi?",
      async () => {
        if (isElectron) {
          try {
            await window.electronAPI.clearCache();
            UI.showNotification("Kesh tozalandi", "success");
            UI.calculateCacheSize();
          } catch (err) {
            UI.showNotification("Keshni tozalashda xatolik", "error");
          }
        }
      },
      true,
    );
  });

  // ======= Skin Yuklash =======
  const skinUploadBtn = document.getElementById("skinUploadBtn");
  const skinFileInput = document.getElementById("skinFileInput");

  skinUploadBtn?.addEventListener("click", () => {
    skinFileInput?.click();
  });

  skinFileInput?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".png")) {
      UI.showNotification(
        "Faqat PNG formatli skin fayl yuklashingiz mumkin",
        "error",
      );
      return;
    }

    try {
      await UI.uploadSkin(file);
      UI.showNotification("Skin muvaffaqiyatli yuklandi!", "success");
    } catch (error) {
      UI.showNotification(error.message, "error");
    }
  });

  // ======= Confirm Dialog — Cancel =======
  document
    .getElementById("confirmDialogCancel")
    ?.addEventListener("click", () => {
      UI.hideConfirmDialog();
    });

  // ======= Crash Modal =======
  elements.crashModalClose?.addEventListener("click", () => {
    if (elements.crashModal) elements.crashModal.classList.remove("active");
  });
  elements.openLogsBtn?.addEventListener("click", () => {
    if (isElectron) window.electronAPI.openLogsFolder();
  });
}
