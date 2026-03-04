// =============================================
// UI Module — CyberCraft Launcher
// =============================================
const UI = {
  showLogin() {
    if (elements.loginPage) elements.loginPage.style.display = "flex";
    if (elements.mainContainer) elements.mainContainer.style.display = "none";
    if (elements.loginError) elements.loginError.textContent = "";
  },

  showMain() {
    if (elements.loginPage) elements.loginPage.style.display = "none";
    if (elements.mainContainer) elements.mainContainer.style.display = "flex";

    if (elements.displayUsername) {
      elements.displayUsername.textContent =
        AppState.user?.username || "Player";
    }

    this.loadServers();
    this.loadNews();
    this.updateConnectionStatus("connected");

    if (elements.launcherStatus) {
      elements.launcherStatus.textContent = "Tayyor";
      elements.launcherStatus.classList.add("ready");
    }

    // Serverlarni har 30 sekundda ping qilish
    if (!AppState.serverPingInterval) {
      AppState.serverPingInterval = setInterval(() => {
        this.loadServers();
      }, 30000);
    }
  },

  updateConnectionStatus(status) {
    const statusEl = elements.connectionStatus;
    if (!statusEl) return;
    statusEl.className = "connection-status " + status;

    const textEl = statusEl.querySelector(".status-text");
    if (!textEl) return;
    switch (status) {
      case "connected":
        textEl.textContent = "Ulangan";
        break;
      case "error":
        textEl.textContent = "Xato";
        break;
      default:
        textEl.textContent = "Ulanmoqda...";
    }
  },

  async loadServers() {
    console.log("[v0] loadServers() called");

    try {
      const response = await API.request("/api/launcher/servers/");

      const servers = Array.isArray(response)
        ? response
        : response.servers || response.results || [];

      AppState.servers = servers;

      if (servers.length === 0) {
        if (elements.serversList) {
          elements.serversList.innerHTML = `
            <div class="servers-empty">
              <p>Hozircha serverlar mavjud emas</p>
            </div>
          `;
        }
        if (elements.serverSelect) {
          elements.serverSelect.innerHTML =
            '<option value="">Hozircha serverlar yo\'q</option>';
        }
        return;
      }

      if (elements.serverSelect) {
        elements.serverSelect.innerHTML = servers
          .map(
            (s) =>
              `<option value="${escapeHTML(String(s.id))}">${escapeHTML(s.name)} ${s.minecraft_version ? `(${escapeHTML(s.minecraft_version)})` : ""} ${s.status === "offline" ? "[Offline]" : ""}</option>`,
          )
          .join("");
        elements.serverSelect.disabled = false;
      }

      if (elements.serversList) {
        elements.serversList.innerHTML = servers
          .map((server) => {
            const isOnline =
              server.status === "online" || server.status === "running";

            return `
              <div class="server-card" data-server-id="${escapeHTML(String(server.id))}">
                <div class="server-status ${isOnline ? "online" : "offline"}"></div>
                ${server.icon_url ? `<img src="${escapeHTML(server.icon_url)}" alt="${escapeHTML(server.name)}" class="server-image" />` : ""}
                <div class="server-info">
                  <h3>${escapeHTML(server.name)}</h3>
                  <p>${escapeHTML(server.description || "")}</p>
                  <span class="server-version">${escapeHTML(server.minecraft_version || "")}</span>
                </div>
                <div class="server-stats">
                  <span class="players">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                    ${server.current_players || 0}/${server.max_players || 0}
                  </span>
                </div>
                <button class="select-btn" ${!isOnline ? "disabled" : ""}>
                  ${!isOnline ? "Offline" : "Tanlash"}
                </button>
              </div>
            `;
          })
          .join("");
      }

      if (servers.length > 0 && !AppState.selectedServer) {
        this.selectServer(servers[0].id);
      }
    } catch (error) {
      console.error("loadServers error:", error);
      if (elements.serversList) {
        elements.serversList.innerHTML = `
          <div class="servers-error">
            <p class="error">Serverlarni yuklashda xato: ${error.message}</p>
          </div>
        `;
      }
    }
  },

  async loadNews() {
    try {
      const news = await API.request("/api/public/news/");
      AppState.news = Array.isArray(news) ? news : news.results || [];
      this.renderNewsGrid();
      this.renderNewsList();
    } catch (error) {
      console.error("Load news error:", error);
      if (elements.newsGrid) {
        elements.newsGrid.innerHTML = `<p class="news-loading">Yangiliklar yuklashda xato</p>`;
      }
    }
  },

  renderNewsGrid() {
    const newsToShow = AppState.news.slice(0, 3);
    if (!elements.newsGrid) return;

    if (newsToShow.length === 0) {
      elements.newsGrid.innerHTML = `<p class="news-loading">Yangiliklar topilmadi</p>`;
      return;
    }

    elements.newsGrid.innerHTML = newsToShow
      .map(
        (item) => `
      <div class="news-card" data-news-id="${item.id}">
        <div class="news-image-wrapper">
          ${
            item.image_url
              ? `
            <div class="news-image" style="background-image: url('${item.image_url}')"></div>
            <div class="news-image-overlay"></div>
          `
              : `
            <div class="news-image news-image-placeholder">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" opacity="0.2">
                <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/>
              </svg>
            </div>
            <div class="news-image-overlay"></div>
          `
          }
          <div class="news-category-badge">
            <span class="news-category" style="background: ${item.category_color}40; color: ${item.category_color}; border: 1px solid ${item.category_color}60">
              ${item.category}
            </span>
          </div>
        </div>
        <div class="news-content">
          <div class="news-meta">
            <span class="news-date">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              ${new Date(item.date).toLocaleDateString("uz-UZ", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span class="news-divider"></span>
            <span class="news-author-info">
              <div class="news-author-avatar">${item.author?.charAt(0).toUpperCase() || "A"}</div>
              ${item.author}
            </span>
          </div>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.excerpt)}</p>
          <div class="news-read-more">
            <span>To'liq o'qish</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  },

  renderNewsList() {
    if (!elements.newsListFull) return;

    const filteredNews =
      AppState.newsFilter === "all"
        ? AppState.news
        : AppState.news.filter((n) => n.category === AppState.newsFilter);

    if (filteredNews.length === 0) {
      elements.newsListFull.innerHTML = `<p class="news-loading">Yangiliklar topilmadi</p>`;
      return;
    }

    elements.newsListFull.innerHTML = filteredNews
      .map(
        (item) => `
      <div class="news-list-item" data-news-id="${item.id}">
        <div class="news-list-image-wrapper">
          ${
            item.image_url
              ? `
            <div class="news-list-image" style="background-image: url('${item.image_url}')"></div>
            <div class="news-list-image-overlay"></div>
          `
              : `
            <div class="news-list-image news-list-image-placeholder">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor" opacity="0.2">
                <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"/>
              </svg>
            </div>
            <div class="news-list-image-overlay"></div>
          `
          }
          <div class="news-list-category-badge">
            <span class="news-category" style="background: ${item.category_color}40; color: ${item.category_color}; border: 1px solid ${item.category_color}60">
              ${item.category}
            </span>
          </div>
        </div>
        <div class="news-list-content">
          <div class="news-list-meta">
            <span class="news-date">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              ${new Date(item.date).toLocaleDateString("uz-UZ", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span class="news-divider"></span>
            <span class="news-author-info">
              <div class="news-author-avatar">${item.author?.charAt(0).toUpperCase() || "A"}</div>
              ${item.author}
            </span>
          </div>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.excerpt)}</p>
          <div class="news-list-footer">
            <span class="news-read-more">
              Batafsil o'qish
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5l7 7-7 7"/>
              </svg>
            </span>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  },

  showNewsModal(newsId) {
    const news = AppState.news.find((n) => n.id === Number.parseInt(newsId));
    if (!news) return;

    AppState.selectedNews = news;

    if (elements.newsModalHeader) {
      elements.newsModalHeader.style.backgroundImage = news.image_url
        ? `url('${news.image_url}')`
        : "";
    }
    if (elements.newsModalMeta) {
      elements.newsModalMeta.innerHTML = `
        <span class="news-category" style="background: ${news.category_color}20; color: ${news.category_color}">
          ${news.category}
        </span>
        <span class="news-date">${new Date(news.date).toLocaleDateString("uz-UZ")}</span>
        <span class="news-author">Muallif: ${news.author}</span>
      `;
    }
    if (elements.newsModalTitle)
      elements.newsModalTitle.textContent = news.title;
    if (elements.newsModalText) {
      elements.newsModalText.innerHTML = `<p>${escapeHTML(news.content || news.excerpt)}</p>`;
    }
    if (elements.newsModal) elements.newsModal.classList.add("active");
  },

  showChangelog() {
    const changelog = [
      {
        version: "v2.1.0",
        date: "2024-02-21",
        changes: [
          "Modular renderer arxitekturasi",
          "Real-time server ping",
          "O'yin vaqti tracking",
          "Crash reporter",
          "System Tray integratsiyasi",
          "Download retry (3 marta)",
        ],
      },
      {
        version: "v2.0.5",
        date: "2024-02-15",
        changes: [
          "NeoForge 1.21.4 qo'llab-quvvatlash",
          "Java 21 avtomatik aniqlash",
          "Launcher dizayni yangilanishi",
        ],
      },
    ];

    AppState.selectedNews = { title: "Launcher Changelog" };
    if (elements.newsModalHeader)
      elements.newsModalHeader.style.backgroundImage =
        "linear-gradient(135deg, var(--primary), var(--secondary))";
    if (elements.newsModalMeta)
      elements.newsModalMeta.innerHTML = `<span class="news-date">Oxirgi yangilanish: ${changelog[0].date}</span>`;
    if (elements.newsModalTitle)
      elements.newsModalTitle.textContent = "CyberCraft Launcher Changelog";

    let html = '<div style="padding: 10px 0;">';
    changelog.forEach((item) => {
      html += `
        <div style="margin-bottom: 25px; border-left: 2px solid var(--primary); padding-left: 15px;">
          <h3 style="color: var(--primary); margin-bottom: 8px;">${item.version} <span style="font-size: 0.8em; color: var(--text-dim); font-weight: normal; margin-left: 10px;">${item.date}</span></h3>
          <ul style="padding-left: 0; list-style: none; color: #ccc;">
            ${item.changes.map((c) => `<li style="margin-bottom: 6px; position: relative; padding-left: 20px;"><span style="position: absolute; left: 0; color: var(--secondary);">▶</span> ${c}</li>`).join("")}
          </ul>
        </div>
      `;
    });
    html += "</div>";

    if (elements.newsModalText) elements.newsModalText.innerHTML = html;
    if (elements.newsModal) elements.newsModal.classList.add("active");
  },

  hideNewsModal() {
    if (elements.newsModal) elements.newsModal.classList.remove("active");
    AppState.selectedNews = null;
  },

  async selectServer(serverId) {
    const server = AppState.servers.find(
      (s) => String(s.id) === String(serverId),
    );
    if (!server) {
      console.error("Server not found:", serverId);
      return;
    }

    AppState.selectedServer = server;
    if (elements.serverSelect) elements.serverSelect.value = serverId;

    document.querySelectorAll(".server-card").forEach((card) => {
      card.classList.toggle(
        "selected",
        card.dataset.serverId === String(serverId),
      );
    });

    // Update Hero Section
    const heroServerName = document.getElementById("heroServerName");
    const heroSubtitle = document.getElementById("heroServerSubtitle");
    const heroBg = document.getElementById("heroBg");

    if (heroServerName) {
      heroServerName.textContent = server.name;
      heroServerName.setAttribute("data-text", server.name);
    }
    if (heroSubtitle) {
      heroSubtitle.textContent =
        server.description || `${server.minecraft_version || ""} Server`;
    }
    if (heroBg && server.background_image_url) {
      heroBg.style.backgroundImage = `url('${server.background_image_url}')`;
      heroBg.style.backgroundSize = "cover";
      heroBg.style.backgroundPosition = "center";
    } else if (heroBg) {
      heroBg.style.backgroundImage = "";
    }

    // Update Server Info Cards
    const serverInfoSection = document.getElementById("serverInfoSection");
    const serverPlayers = document.getElementById("serverPlayers");
    const serverVersion = document.getElementById("serverVersion");
    const serverStatus = document.getElementById("serverStatus");

    if (serverInfoSection) serverInfoSection.style.display = "block";
    if (serverPlayers)
      serverPlayers.textContent = `${server.current_players || 0}/${server.max_players || 20}`;
    if (serverVersion)
      serverVersion.textContent = server.minecraft_version || "Unknown";
    if (serverStatus) {
      const isOnline =
        server.status === "online" || server.status === "running";
      serverStatus.textContent = isOnline ? "Online" : "Offline";
      serverStatus.style.color = isOnline ? "var(--accent)" : "var(--error)";
    }

    // Playtime
    this.updatePlaytimeDisplay(server.id);

    ManifestSync.fetchManifest(server);
  },

  async updatePlaytimeDisplay(serverId) {
    if (!elements.playtimeDisplay) return;
    if (isElectron) {
      try {
        const seconds = await window.electronAPI.getPlaytime(serverId);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        elements.playtimeDisplay.textContent =
          hours > 0 ? `${hours} soat ${minutes} daqiqa` : `${minutes} daqiqa`;
      } catch (e) {
        elements.playtimeDisplay.textContent = "0 daqiqa";
      }
    }
  },

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

  showNotification(message, type = "info") {
    const container =
      document.getElementById("notificationContainer") ||
      (() => {
        const div = document.createElement("div");
        div.id = "notificationContainer";
        div.style.cssText =
          "position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;pointer-events:none;";
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

  updateSettingsUI() {
    const s = AppState.settings;

    if (elements.settingsRamSlider) {
      elements.settingsRamSlider.value = s.ram;
      if (elements.settingsRamValue)
        elements.settingsRamValue.textContent = `${s.ram} GB`;
    }
    if (elements.jvmArgs) elements.jvmArgs.value = s.jvmArgs || "";
    if (elements.hideOnLaunch) elements.hideOnLaunch.checked = !!s.hideOnLaunch;
    if (elements.startWithWindows)
      elements.startWithWindows.checked = !!s.startWithWindows;
    if (elements.autoCheckUpdates)
      elements.autoCheckUpdates.checked = !!s.autoCheckUpdates;
    if (elements.discordRPC) elements.discordRPC.checked = !!s.discordRPC;
    if (elements.fullscreen) elements.fullscreen.checked = !!s.fullscreen;
    if (elements.gameResolution)
      elements.gameResolution.value = s.gameResolution;
    if (elements.saveLogs) elements.saveLogs.checked = !!s.saveLogs;

    if (AppState.user) {
      const settingsUsername = document.getElementById("settingsUsername");
      const settingsEmail = document.getElementById("settingsEmail");
      const settingsWhitelist = document.getElementById("settingsWhitelist");
      const settingsUserAvatar = document.getElementById("settingsUserAvatar");
      const userAvatar = document.getElementById("userAvatar");

      if (settingsUsername)
        settingsUsername.textContent =
          AppState.user.username || "Foydalanuvchi";
      if (settingsEmail)
        settingsEmail.textContent =
          AppState.user.email || "Email ko'rsatilmagan";

      if (settingsWhitelist) {
        if (AppState.user.is_whitelisted) {
          settingsWhitelist.className = "detail-value status-badge whitelisted";
          settingsWhitelist.innerHTML =
            '<span class="status-indicator"></span>Whitelist';
        } else {
          settingsWhitelist.className =
            "detail-value status-badge not-whitelisted";
          settingsWhitelist.innerHTML =
            '<span class="status-indicator"></span>Whitelistda emas';
        }
      }

      // Avatar fallback — icon.png ishlatiladi agar skin yo'q
      const avatarUrl = AppState.user.skin_face_url || "icon.png";
      if (settingsUserAvatar) settingsUserAvatar.src = avatarUrl;
      if (userAvatar) userAvatar.src = avatarUrl;
    }
  },

  async uploadSkin(file) {
    const formData = new FormData();
    formData.append("skin", file);

    try {
      const response = await fetch(
        `${CONFIG.API_BASE_URL}/api/auth/launcher/skin/`,
        {
          method: "POST",
          headers: { Authorization: `Token ${AppState.token}` },
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Skin yuklashda xatolik");
      }

      const data = await response.json();
      if (data.skin_face_url) {
        AppState.user.skin_face_url = data.skin_face_url;
        this.updateSettingsUI();
      }
      return data;
    } catch (error) {
      console.error("Skin upload error:", error);
      throw error;
    }
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

  async calculateCacheSize() {
    const cacheEl = document.getElementById("cacheSize");
    if (!cacheEl) return;

    if (isElectron) {
      try {
        const size = await window.electronAPI.getCacheSize();
        cacheEl.textContent = `${(size / 1024 / 1024).toFixed(2)} MB ishlatilmoqda`;
      } catch {
        cacheEl.textContent = "Hisoblab bo'lmadi";
      }
    } else {
      cacheEl.textContent = "Demo rejimda mavjud emas";
    }
  },
};
