// =============================================
// API & Auth Module — CyberCraft Launcher
// =============================================
const API = {
  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (AppState.token) {
      headers["Authorization"] = `Token ${AppState.token}`;
    }

    if (CONFIG.DEMO_MODE) {
      return this.mockRequest(endpoint, options);
    }

    try {
      const fullUrl = `${CONFIG.API_BASE_URL}${endpoint}`;

      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });

      // 401 Unauthorized — sessiya yaroqsiz
      if (response.status === 401) {
        console.warn("401 Unauthorized — sessiya muddati tugagan");
        AppState.token = null;
        AppState.user = null;
        AppState.isAuthenticated = false;
        if (isElectron) {
          await window.electronAPI.clearToken();
        }
        UI.showLogin();
        throw new Error("Sessiya muddati tugadi. Iltimos, qayta kiring.");
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error response:", errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("API Request failed:", error);
      throw error;
    }
  },

  async mockRequest(endpoint, options = {}) {
    await new Promise((resolve) =>
      setTimeout(resolve, 300 + Math.random() * 500),
    );

    // Login
    if (endpoint === "/api/auth/launcher/login/") {
      return {
        token: "demo-token-12345",
        user: {
          id: 1,
          username: "DemoPlayer",
          email: "demo@cybercraft.uz",
          skin_face_url: null,
          is_whitelisted: true,
        },
      };
    }

    // Me
    if (endpoint === "/api/auth/launcher/me/") {
      return {
        id: 1,
        username: "DemoPlayer",
        email: "demo@cybercraft.uz",
        skin_face_url: null,
        is_whitelisted: true,
      };
    }

    // Logout
    if (endpoint === "/api/auth/launcher/logout/") {
      return { success: true };
    }

    // Server list
    if (endpoint === "/api/launcher/servers/") {
      return [
        {
          id: 1,
          name: "CyberCraft Survival",
          description: "Asosiy survival server",
          minecraft_version: "1.21.4",
          neoforge_version: "21.4.0-beta",
          status: "online",
          current_players: 12,
          max_players: 50,
          icon_url: null,
          background_image_url: null,
        },
        {
          id: 2,
          name: "CyberCraft Creative",
          description: "Creative rejim server",
          minecraft_version: "1.21.4",
          status: "online",
          current_players: 5,
          max_players: 30,
          icon_url: null,
          background_image_url: null,
        },
      ];
    }

    // Manifest
    if (endpoint.includes("/manifest/")) {
      return {
        files: {
          mods: [
            {
              filename: "demo-mod.jar",
              hash: "abc123",
              file_size: 1024000,
              download_url: "#",
            },
          ],
          resourcepacks: [],
          shaders: [],
          config: [],
        },
      };
    }

    // News
    if (endpoint === "/api/public/news/") {
      return [
        {
          id: 1,
          title: "CyberCraft 2.0 chiqdi!",
          excerpt: "Yangi versiya ko'plab yaxshilanishlar bilan keldi.",
          content:
            "CyberCraft 2.0 versiyasi chiqdi! NeoForge 1.21.4 qo'llab-quvvatlash, yangi modlar va ko'plab optimizatsiyalar.",
          category: "Yangilik",
          category_color: "#00f0ff",
          image_url: null,
          date: new Date().toISOString(),
          author: "Admin",
        },
      ];
    }

    return {};
  },
};

const Auth = {
  async login(username, password) {
    const response = await API.request("/api/auth/launcher/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    const token =
      response.token ||
      response.auth_token ||
      response.key ||
      response.access_token;
    if (!token)
      throw new Error("Token topilmadi. Backend javobini tekshiring.");

    AppState.token = token;
    AppState.user = response.user || { username: username };
    AppState.isAuthenticated = true;

    if (isElectron) {
      await window.electronAPI.saveToken(token);
      await window.electronAPI.saveUser(AppState.user);
    } else {
      sessionStorage.setItem("launcher_token", token);
      sessionStorage.setItem("launcher_user", JSON.stringify(AppState.user));
    }

    return response;
  },

  async logout() {
    try {
      if (AppState.token) {
        await API.request("/api/auth/launcher/logout/", { method: "POST" });
      }
    } catch (error) {
      console.error("Logout request error:", error);
    }

    // Ping interval'ni tozalash
    if (AppState.serverPingInterval) {
      clearInterval(AppState.serverPingInterval);
      AppState.serverPingInterval = null;
    }

    AppState.token = null;
    AppState.user = null;
    AppState.isAuthenticated = false;
    AppState.servers = [];
    AppState.selectedServer = null;
    AppState.manifest = null;

    if (isElectron) {
      await window.electronAPI.clearToken();
    } else {
      sessionStorage.removeItem("launcher_token");
      sessionStorage.removeItem("launcher_user");
    }

    UI.showLogin();
  },

  async checkSession() {
    let token, user;
    if (isElectron) {
      token = await window.electronAPI.getToken();
      user = await window.electronAPI.getUser();
    } else {
      token = sessionStorage.getItem("launcher_token");
      user = JSON.parse(sessionStorage.getItem("launcher_user") || "null");
    }

    if (token) {
      AppState.token = token;
      try {
        const meResponse = await API.request("/api/auth/launcher/me/");
        AppState.user = meResponse.user || meResponse;
        AppState.isAuthenticated = true;
        if (isElectron) {
          await window.electronAPI.saveUser(AppState.user);
        } else {
          sessionStorage.setItem(
            "launcher_user",
            JSON.stringify(AppState.user),
          );
        }
        return true;
      } catch (error) {
        console.error("Session check failed:", error);
        // Token yaroqsiz — tozalash
        AppState.token = null;
        if (isElectron) await window.electronAPI.clearToken();
        return false;
      }
    }
    return false;
  },
};
