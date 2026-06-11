// =============================================
// UI Module — CyberCraft Launcher (Simplified)
// =============================================
const UI = {
  showLogin() {
    if (elements.loginPage) elements.loginPage.style.display = "flex";
    if (elements.mainContainer) elements.mainContainer.style.display = "none";
    if (elements.titleBarActions)
      elements.titleBarActions.style.display = "none";
    if (elements.loginError) elements.loginError.textContent = "";
  },

  showMain() {
    if (elements.loginPage) elements.loginPage.style.display = "none";
    if (elements.mainContainer) elements.mainContainer.style.display = "block";
    if (elements.titleBarActions)
      elements.titleBarActions.style.display = "flex";

    // Show settings button
    if (elements.settingsBtn) elements.settingsBtn.style.display = "block";

    if (elements.titleUsername) {
      elements.titleUsername.textContent = AppState.user?.username || "Player";
    }

    if (elements.userRankBadge) {
      elements.userRankBadge.textContent = AppState.user?.rank || "O'yinchi";
    }

    // Avatar rendering (Image or Letter fallback)
    const avatarEl = document.getElementById("userAvatarLetter");
    if (avatarEl && AppState.user) {
      if (AppState.user.skin_face_url) {
        avatarEl.style.backgroundImage = `url('${AppState.user.skin_face_url}')`;
        avatarEl.style.backgroundSize = "cover";
        avatarEl.style.backgroundPosition = "center";
        avatarEl.textContent = "";
        avatarEl.style.border = "1px solid rgba(0, 240, 255, 0.3)";
      } else {
        avatarEl.style.backgroundImage = "none";
        avatarEl.textContent = (AppState.user.username || "P")
          .charAt(0)
          .toUpperCase();
        avatarEl.style.border = "none";
      }
    }

    this.loadServers();

  },

  // ========== PAGE NAVIGATION ==========

  showServerDetail(serverId) {
    const server = AppState.servers.find(
      (s) => String(s.id) === String(serverId),
    );
    if (!server) return;

    AppState.selectedServer = server;

    // Update bottom bar active state
    document.querySelectorAll(".server-icon-item").forEach((item) => {
      if (item.getAttribute("data-server-id") === String(serverId)) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
    // Dashboard Icon
    const dashboardIcon = document.getElementById("dashboardServerIcon");
    if (dashboardIcon) {
      const isOnline = server.status === "online" || server.status === "running";
      dashboardIcon.innerHTML = `<img src="${escapeHTML(server.icon_url || "icon.png")}" 
           onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%2300ffff\'%3E%3Cpath d=\'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5\'/%3E%3C/svg%3E'" 
           alt="${escapeHTML(server.name)}" />`;
      
      if (isOnline) {
        dashboardIcon.classList.add("online");
      } else {
        dashboardIcon.classList.remove("online");
      }
    }

    // Background transition
    if (elements.detailBackground) {
      if (server.background_image_url) {
        elements.detailBackground.style.backgroundImage = `url("${server.background_image_url}")`;
        elements.detailBackground.style.opacity = "1";
      } else {
        elements.detailBackground.style.backgroundImage = "none";
        elements.detailBackground.style.opacity = "0.3";
      }
    }

    // Highlight active icon
    document.querySelectorAll(".server-icon-item").forEach((item) => {
      item.classList.remove("active");
      if (item.dataset.serverId === String(serverId))
        item.classList.add("active");
    });

    // Server name and description
    if (elements.detailServerName) {
      elements.detailServerName.textContent = server.name;
    }
    if (elements.detailDescription) {
      elements.detailDescription.textContent =
        server.description || "Tavsif mavjud emas.";
    }

    // Category tag
    if (elements.detailCategory) {
      elements.detailCategory.textContent = server.category || "Survival";
    }

    // Online count
    if (elements.detailOnlineCount) {
      elements.detailOnlineCount.textContent = server.current_players || 0;
    }

    // Last wipe
    if (elements.detailLastWipe) {
      if (server.last_wipe) {
        const d = new Date(server.last_wipe);
        const months = [
          "Yanvar",
          "Fevral",
          "Mart",
          "Aprel",
          "May",
          "Iyun",
          "Iyul",
          "Avgust",
          "Sentabr",
          "Oktabr",
          "Noyabr",
          "Dekabr",
        ];
        elements.detailLastWipe.textContent = `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
      } else {
        elements.detailLastWipe.textContent = "\u2014";
      }
    }

    // Gallery images
    if (elements.detailGallery) {
      const images = server.gallery_images || [];
      if (images.length > 0) {
        elements.detailGallery.innerHTML = images
          .slice(0, 4)
          .map(
            (img) => `
            <div class="detail-gallery-item">
              <img src="${escapeHTML(img.image_url || img.url)}" alt="${escapeHTML(img.caption || server.name)}" loading="lazy" />
            </div>
          `,
          )
          .join("");
      } else {
        // Placeholder images or empty
        elements.detailGallery.innerHTML = `
          <div class="detail-gallery-item empty"></div>
          <div class="detail-gallery-item empty"></div>
          <div class="detail-gallery-item empty"></div>
          <div class="detail-gallery-item empty"></div>
        `;
      }
    }

    // Features / MetaMods
    if (elements.detailFeaturesGrid) {
      const features = server.features || [];
      if (features.length > 0) {
        if (elements.detailFeaturesTitle) {
          elements.detailFeaturesTitle.textContent =
            server.modpack_name || "Xususiyatlar";
        }
        const iconMap = {
          sword: "\u2694\uFE0F",
          shield: "\uD83D\uDEE1\uFE0F",
          puzzle: "\uD83E\uDDE9",
          gem: "\uD83D\uDC8E",
          star: "\u2B50",
          fire: "\uD83D\uDD25",
          world: "\uD83C\uDF0D",
          magic: "\u2728",
          gear: "\u2699\uFE0F",
          heart: "\u2764\uFE0F",
          tree: "\uD83C\uDF33",
          pickaxe: "\u26CF\uFE0F",
        };
        elements.detailFeaturesGrid.innerHTML = features
          .map(
            (feat) => `
            <div class="detail-feature-card">
              <div class="detail-feature-icon">${iconMap[feat.icon] || "\uD83E\uDDE9"}</div>
              <h4>${escapeHTML(feat.title)}</h4>
              <p>${escapeHTML(feat.description)}</p>
            </div>
          `,
          )
          .join("");
      } else {
        elements.detailFeaturesGrid.innerHTML = `
          <div class="detail-features-empty">Xususiyatlar haqida ma'lumot yo'q</div>
        `;
      }
    }

    if (elements.syncStatus) {
      elements.syncStatus.textContent = "Sinxronizatsiyaga tayyor";
    }

    // Fetch manifest
    ManifestSync.fetchManifest(server);
  },

  // ========== SERVER LIST ==========

  async loadServers() {
    try {
      const response = await API.request("/launcher/servers/");
      const servers = Array.isArray(response)
        ? response
        : response.servers || response.results || [];

      AppState.servers = servers;

      // Jami onlayn o'yinchilarni hisoblash
      const totalOnline = servers.reduce(
        (acc, s) => acc + (s.current_players || 0),
        0,
      );
      if (elements.totalOnlineCount) {
        elements.totalOnlineCount.textContent = totalOnline;
      }

      if (!elements.serverIconList) return;

      if (servers.length === 0) {
        elements.serverIconList.innerHTML = `
          <li class="servers-empty">Severlar yo'q</li>
        `;
        return;
      }

      elements.serverIconList.innerHTML = servers
        .map((server) => {
          const isOnline =
            server.status === "online" || server.status === "running";
          const isActive =
            AppState.selectedServer &&
            String(AppState.selectedServer.id) === String(server.id);
          return `
            <li class="server-icon-item ${isActive ? "active" : ""} ${isOnline ? "online" : "offline"}" 
                data-server-id="${escapeHTML(String(server.id))}" 
                onclick="UI.showServerDetail('${escapeHTML(String(server.id))}')"
                title="${escapeHTML(server.name)}">
              <img src="${escapeHTML(server.icon_url || "icon.png")}" 
                   onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%2300ffff\'%3E%3Cpath d=\'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5\'/%3E%3C/svg%3E'" 
                   alt="${escapeHTML(server.name)}" />
              <div class="status-indicator"></div>
            </li>
          `;
        })
        .join("");

      // Avto-tanlash birinchi server
      if (!AppState.selectedServer && servers.length > 0) {
        this.showServerDetail(servers[0].id);
      } else if (AppState.selectedServer) {
        // Refresh detail for current active
        this.showServerDetail(AppState.selectedServer.id);
      }
    } catch (error) {
      console.error("loadServers error:", error);
    }
  },

  // ========== MANIFEST ==========

  updateManifestStatus(status, text) {
    const badge = elements.manifestBadge;
    if (!badge) return;
    badge.className = "manifest-badge " + status;
    badge.textContent = text;
  },

  updateManifestStats(manifest) {
    const files = manifest.files || {};
    if (elements.modsCount)
      elements.modsCount.textContent = (files.mods || []).length;
    if (elements.resourcepacksCount)
      elements.resourcepacksCount.textContent = (
        files.resourcepacks || []
      ).length;
    if (elements.shadersCount)
      elements.shadersCount.textContent = (files.shaders || []).length;

    const totalBytes = [
      ...(files.mods || []),
      ...(files.resourcepacks || []),
      ...(files.shaders || []),
    ].reduce((sum, f) => sum + (f.file_size || f.size || 0), 0);
    if (elements.totalSize)
      elements.totalSize.textContent = this.formatBytes(totalBytes);

    this.updateManifestStatus("synced", "Sinxronlangan");
  },

  formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
    );
  },

  // ========== SETTINGS MODAL ==========

  showSettingsModal() {
    if (elements.settingsOverlay)
      elements.settingsOverlay.classList.add("active");
  },

  hideSettingsModal() {
    if (elements.settingsOverlay)
      elements.settingsOverlay.classList.remove("active");
  },

  async updateSettingsUI() {
    const s = AppState.settings;

    // Detect system RAM if in Electron
    if (isElectron && !AppState.systemRamDetected) {
      try {
        const totalRamGB = await window.electronAPI.getSystemRam();
        if (totalRamGB) {
          AppState.totalSystemRam = totalRamGB;
          AppState.systemRamDetected = true;

          // Update Slider Max
          if (elements.settingsRamSlider) {
            elements.settingsRamSlider.max = totalRamGB;

            // Generate visual marks dynamically
            const marksContainer = document.getElementById("ramMarks");
            if (marksContainer) {
              marksContainer.innerHTML = "";
              // Show marks for every 1GB up to system RAM
              for (let i = 1; i <= totalRamGB; i++) {
                const span = document.createElement("span");
                const percent =
                  totalRamGB > 1 ? ((i - 1) / (totalRamGB - 1)) * 100 : 0;
                span.style.left = `${percent}%`;
                span.textContent = `${i}GB`;
                marksContainer.appendChild(span);
              }
            }
          }

          // If current RAM setting is higher than system, reset it
          if (s.ram > totalRamGB) {
            s.ram = Math.floor(totalRamGB / 2);
          }
        }
      } catch (err) {
        console.error("RAM detection error:", err);
      }
    }

    if (elements.settingsRamSlider) {
      elements.settingsRamSlider.value = s.ram;
      if (elements.settingsRamValueMB)
        elements.settingsRamValueMB.textContent = `${s.ram * 1024} MB`;
    }
    if (elements.optimizeJava)
      elements.optimizeJava.checked = s.optimizeJava !== false;
    if (elements.fullscreenMode)
      elements.fullscreenMode.checked = !!s.fullscreen;
    if (elements.debugMode) elements.debugMode.checked = !!s.debug;
    if (elements.redownloadFiles) elements.redownloadFiles.checked = false; // Always reset
  },

  async saveSettings() {
    if (isElectron) {
      await window.electronAPI.saveSettings(AppState.settings);
    } else {
      localStorage.setItem(
        "launcher_settings",
        JSON.stringify(AppState.settings),
      );
    }
  },

  // ========== NOTIFICATIONS ==========

  showNotification(message, type = "info") {
    const container =
      document.getElementById("notificationContainer") ||
      (() => {
        const div = document.createElement("div");
        div.id = "notificationContainer";
        div.style.cssText =
          "position:fixed;top:48px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;pointer-events:none;";
        document.body.appendChild(div);
        return div;
      })();

    const colors = {
      success: {
        bg: "rgba(0,255,136,0.15)",
        border: "#00ff88",
        text: "#00ff88",
      },
      error: { bg: "rgba(255,0,96,0.15)", border: "#ff0060", text: "#ff0060" },
      warning: {
        bg: "rgba(255,170,0,0.15)",
        border: "#ffaa00",
        text: "#ffaa00",
      },
      info: { bg: "rgba(0,240,255,0.15)", border: "#00f0ff", text: "#00f0ff" },
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement("div");
    toast.style.cssText = `
      background:${c.bg};border:1px solid ${c.border};color:${c.text};
      padding:12px 20px;border-radius:8px;font-size:14px;pointer-events:auto;
      backdrop-filter:blur(10px);animation:slideIn 0.3s ease;max-width:400px;
      display:flex;align-items:center;gap:10px;
    `;
    toast.textContent = message;

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    closeBtn.style.cssText =
      "background:none;border:none;color:inherit;font-size:18px;cursor:pointer;padding:0;margin-left:auto;";
    closeBtn.onclick = () => toast.remove();
    toast.appendChild(closeBtn);

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = "slideOut 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // ========== LOADING ==========

  showLoading(text = "Yuklanmoqda...") {
    if (elements.loadingOverlay) elements.loadingOverlay.style.display = "flex";
    if (elements.loadingText) elements.loadingText.textContent = text;
    if (elements.progressFill) elements.progressFill.style.width = "0%";
    if (elements.progressText) elements.progressText.textContent = "0%";
  },

  hideLoading() {
    if (elements.loadingOverlay) elements.loadingOverlay.style.display = "none";
  },

  updateProgress(percent, details = "") {
    if (elements.progressFill)
      elements.progressFill.style.width = percent + "%";
    if (elements.progressText)
      elements.progressText.textContent = Math.round(percent) + "%";
    if (details && elements.syncDetails)
      elements.syncDetails.textContent = details;
  },

  // ========== CONFIRM DIALOG ==========

  showConfirmDialog(title, message, onConfirm, isDanger = false) {
    const dialog = document.getElementById("confirmDialog");
    if (!dialog) return;

    const titleEl = document.getElementById("confirmDialogTitle");
    const messageEl = document.getElementById("confirmDialogMessage");
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;

    const confirmBtn = document.getElementById("confirmDialogConfirm");
    if (confirmBtn) {
      confirmBtn.className = `confirm-btn ${isDanger ? "danger" : "confirm"}`;
      confirmBtn.onclick = () => {
        dialog.classList.remove("active");
        onConfirm();
      };
    }

    dialog.classList.add("active");
  },

  hideConfirmDialog() {
    const dialog = document.getElementById("confirmDialog");
    if (dialog) dialog.classList.remove("active");
  },
};
