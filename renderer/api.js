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
      const fullUrl = `${CONFIG.API_BASE_URL}${CONFIG.API_PREFIX}${endpoint}`;

      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });

      // 401 Unauthorized — sessiya yaroqsiz
      if (response.status === 401) {
        AppState.token = null;
        AppState.user = null;
        AppState.isAuthenticated = false;
        if (isElectron) {
          await window.electronAPI.clearToken();
        }
        
        // Agar bu login so'rovi bo'lsa, xato xabarini backenddan olish
        if (endpoint.includes("/auth/launcher/login/")) {
          let errorMessage = "Foydalanuvchi nomi yoki parol noto'g'ri";
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.detail || errorData.message || errorMessage;
          } catch (e) {}
          throw new Error(errorMessage);
        }

        const authErr = new Error("Sessiya muddati tugadi. Iltimos, qayta kiring.");
        authErr.isAuthError = true;
        throw authErr;
      }

      // 403 Forbidden — banned yoki ruxsat yo'q
      if (response.status === 403) {
        let errorMessage = "Ruxsat berilmadi";
        try {
          const errorData = await response.json();
          if (errorData.code === "banned") {
            errorMessage = errorData.error || "Akkauntingiz bloklangan";
            // Banned foydalanuvchini login sahifasiga qaytarish
            AppState.token = null;
            AppState.user = null;
            AppState.isAuthenticated = false;
            if (isElectron) {
              await window.electronAPI.clearToken();
            }
            UI.showLogin();
          } else {
            errorMessage = errorData.error || errorData.detail || errorMessage;
          }
        } catch (e) {
          // JSON parse xatosi — text sifatida o'qish
        }
        throw new Error(errorMessage);
      }

      // 503 Service Unavailable — server o'chirilmoqda
      if (response.status === 503) {
        throw new Error(
          "Server vaqtincha ishlamayapti. Iltimos, keyinroq qayta urinib ko'ring.",
        );
      }

      // 500 Internal Server Error
      if (response.status === 500) {
        throw new Error(
          "Serverda ichki xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.",
        );
      }

      if (!response.ok) {
        let errorMessage = `API Error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage =
            errorData.error ||
            errorData.detail ||
            errorData.message ||
            errorMessage;
        } catch (e) {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        }
        console.error("API Error response:", errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // Network error (serverga ulanib bo'lmadi)
      if (
        error.name === "TypeError" &&
        error.message.includes("fetch")
      ) {
        console.error("Network error:", error);
        throw new Error(
          "Serverga ulanib bo'lmadi. Internet ulanishingizni tekshiring.",
        );
      }
      console.error("API Request failed:", error);
      throw error;
    }
  },

  async mockRequest(endpoint, options = {}) {
    await new Promise((resolve) =>
      setTimeout(resolve, 300 + Math.random() * 500),
    );

    // Login
    if (endpoint === "/auth/launcher/login/") {
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
    if (endpoint === "/auth/launcher/me/") {
      return {
        id: 1,
        username: "DemoPlayer",
        email: "demo@cybercraft.uz",
        skin_face_url: null,
        is_whitelisted: true,
      };
    }

    // Logout
    if (endpoint === "/auth/launcher/logout/") {
      return { success: true };
    }

    // Server list
    if (endpoint === "/launcher/servers/") {
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
    if (endpoint === "/public/news/") {
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
    const response = await API.request("/auth/launcher/login/", {
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
    // Ping interval'ni tozalash
    if (AppState.serverPingInterval) {
      clearInterval(AppState.serverPingInterval);
      AppState.serverPingInterval = null;
    }

    try {
      if (AppState.token) {
        await API.request("/auth/launcher/logout/", { method: "POST" });
      }
    } catch (error) {
      console.error("Logout request error:", error);
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
    let token;
    if (isElectron) {
      token = await window.electronAPI.getToken();
    } else {
      token = sessionStorage.getItem("launcher_token");
    }

    if (token) {
      AppState.token = token;
      try {
        const meResponse = await API.request("/auth/launcher/me/");
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
        if (error.isAuthError) {
          // Disk dagi token yaroqsiz — bu normal holat (DB tozalangan, token expired)
          console.warn("[Auth] Disk da saqlangan token yaroqsiz, login kerak.");
        } else {
          console.error("[Auth] Session tekshirishda xatolik:", error.message);
        }
        AppState.token = null;
        AppState.isAuthenticated = false;
        if (isElectron) await window.electronAPI.clearToken();
        return false;
      }
    }
    return false;
  },
};
