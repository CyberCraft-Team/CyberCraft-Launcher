// =============================================
// Settings & Event Listeners — CyberCraft Launcher (v2)
// =============================================
function initEventListeners() {
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
  elements.logoutBtn?.addEventListener("click", () => {
    UI.showConfirmDialog(
      "Hisobdan chiqish",
      "Hisobingizdan chiqishni tasdiqlaysizmi?",
      () => Auth.logout(),
      true,
    );
  });

  // ======= Server List (Bottom Bar) =======
  if (elements.serverIconList) {
    elements.serverIconList.addEventListener("click", (e) => {
      const item = e.target.closest(".server-icon-item");
      if (item) {
        UI.showServerDetail(item.dataset.serverId);
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

  // ======= Favorite Star =======
  elements.detailFavStar?.addEventListener("click", () => {
    elements.detailFavStar.classList.toggle("active");
    if (elements.detailFavStar.classList.contains("active")) {
      elements.detailFavStar.textContent = "\u2605"; // ★
    } else {
      elements.detailFavStar.textContent = "\u2606"; // ☆
    }
  });

  // ======= Settings Modal Open/Close =======
  elements.settingsBtn?.addEventListener("click", () => {
    UI.showSettingsModal();
    UI.updateSettingsUI();
  });
  elements.settingsCloseBtn?.addEventListener("click", () => {
    UI.hideSettingsModal();
  });
  elements.settingsOverlay?.addEventListener("click", (e) => {
    if (e.target === elements.settingsOverlay) UI.hideSettingsModal();
  });
  elements.settingsCancelBtn?.addEventListener("click", () => {
    UI.hideSettingsModal();
  });

  // ======= Settings — RAM Slider =======
  elements.settingsRamSlider?.addEventListener("input", (e) => {
    const val = parseInt(e.target.value);
    AppState.settings.ram = val;
    if (elements.settingsRamValueMB)
      elements.settingsRamValueMB.textContent = `${val * 1024} MB`;
  });

  // ======= Settings — Checkboxes =======
  elements.optimizeJava?.addEventListener("change", (e) => {
    AppState.settings.optimizeJava = e.target.checked;
  });
  elements.fullscreenMode?.addEventListener("change", (e) => {
    AppState.settings.fullscreen = e.target.checked;
  });
  elements.debugMode?.addEventListener("change", (e) => {
    AppState.settings.debug = e.target.checked;
  });

  // ======= Settings — Browse Game Dir =======
  elements.browseGameDir?.addEventListener("click", async () => {
    if (!isElectron) return;
    try {
      const result = await window.electronAPI.openFolderDialog({
        title: "O'yin papkasini tanlang",
      });
      if (result && result.filePaths && result.filePaths[0]) {
        if (elements.gameDir) elements.gameDir.value = result.filePaths[0];
        AppState.settings.gameDir = result.filePaths[0];
      }
    } catch (error) {
      console.error("Browse folder error:", error);
    }
  });

  // ======= Settings — Open Game Dir =======
  elements.openGameDir?.addEventListener("click", () => {
    if (isElectron) window.electronAPI.openGameFolder();
  });

  // ======= Settings — Reset Game Dir =======
  elements.resetGameDir?.addEventListener("click", () => {
    AppState.settings.gameDir = "";
    if (elements.gameDir) elements.gameDir.value = "";
    UI.showNotification("Papka standart holatga tiklandi", "info");
  });

  // ======= Settings — Save Button =======
  elements.settingsSaveBtn?.addEventListener("click", async () => {
    await UI.saveSettings();
    UI.showNotification("Sozlamalar saqlandi", "success");
    UI.hideSettingsModal();
  });

  // ======= Settings — Reset All =======
  elements.settingsResetBtn?.addEventListener("click", () => {
    UI.showConfirmDialog(
      "Sozlamalarni tiklash",
      "Barcha sozlamalar standart holatga qaytariladi. Davom etasizmi?",
      async () => {
        AppState.settings = {
          ram: 4,
          javaPath: "",
          gameDir: "",
          hideOnLaunch: true,
          optimizeJava: true,
          fullscreen: false,
          debug: false,
          redownload: false,
        };
        await UI.saveSettings();
        UI.updateSettingsUI();
        if (elements.gameDir) elements.gameDir.value = "";
        UI.showNotification("Sozlamalar tiklandi", "info");
      },
      true,
    );
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
