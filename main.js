const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Tray,
  Menu,
} = require("electron");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const crypto = require("crypto");
const https = require("https");
const http = require("http");
const os = require("os");
const { exec, execSync, spawn } = require("child_process");
const { Client } = require("minecraft-launcher-core");
const { launchNeoForgeCustom } = require("./neoforge-launcher");

const DIR_MAP = {
  mods: "mods",
  resourcepacks: "resourcepacks",
  shaders: "shaderpacks",
};

const CONFIG = {
  GAME_DIR: path.join(app.getPath("appData"), "CyberCraft"),
  JAVA_MIN_VERSION: 21,
  API_BASE_URL: "http://127.0.0.1:8000",
};

const DATA_FILE = path.join(app.getPath("userData"), "launcher-data.json");

const Storage = {
  data: {},

  async load() {
    try {
      const content = await fs.readFile(DATA_FILE, "utf-8");
      this.data = JSON.parse(content);
    } catch (err) {
      this.data = {};
    }
  },

  async save() {
    try {
      await fs.writeFile(DATA_FILE, JSON.stringify(this.data, null, 2));
    } catch (err) {
      console.error("Storage save error:", err);
    }
  },

  get(key, defaultValue = null) {
    const keys = key.split(".");
    let value = this.data;
    for (const k of keys) {
      if (value === undefined || value === null) return defaultValue;
      value = value[k];
    }
    return value !== undefined ? value : defaultValue;
  },

  set(key, value) {
    const keys = key.split(".");
    let obj = this.data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    this.save();
  },

  delete(key) {
    const keys = key.split(".");
    let obj = this.data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) return;
      obj = obj[keys[i]];
    }
    delete obj[keys[keys.length - 1]];
    this.save();
  },
};

let mainWindow;
let tray = null;
let gameProcess = null;
const launcher = new Client();

async function createWindow() {
  await Storage.load();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: "#0a0a0f",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      sandbox: false,
    },
    icon: path.join(__dirname, "assets/icon.png"),
  });

  mainWindow.loadFile("index.html");

  // Create Tray
  createTray();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, "assets/icon.png");
  if (!fsSync.existsSync(iconPath)) return;

  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Launcher'ni ochish",
      click: () => {
        mainWindow?.show();
      },
    },
    { type: "separator" },
    {
      label: "Chiqish",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("CyberCraft Launcher");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    mainWindow?.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

launcher.on("debug", (e) => {
  console.log("[MCLC Debug]", e);
});

launcher.on("data", (e) => {
  console.log("[MCLC Data]", e);
});

launcher.on("progress", (e) => {
  if (mainWindow) {
    const percent = Math.round((e.task / e.total) * 100);
    mainWindow.webContents.send("launch-progress", {
      type: e.type,
      task: e.task,
      total: e.total,
      percent: percent,
    });
  }
});

launcher.on("download-status", (e) => {
  if (mainWindow) {
    mainWindow.webContents.send("download-status", {
      name: e.name,
      current: e.current,
      total: e.total,
      type: e.type,
    });
  }
});

ipcMain.on("minimize-window", () => mainWindow?.minimize());
ipcMain.on("maximize-window", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on("close-window", () => mainWindow?.close());

ipcMain.handle("save-token", async (event, token) => {
  Storage.set("auth.token", token);
  return true;
});

ipcMain.handle("get-token", async () => {
  return Storage.get("auth.token");
});

ipcMain.handle("save-user", async (event, user) => {
  Storage.set("auth.user", user);
  return true;
});

ipcMain.handle("get-user", async () => {
  return Storage.get("auth.user");
});

ipcMain.handle("clear-token", async () => {
  Storage.delete("auth.token");
  Storage.delete("auth.user");
  return true;
});

ipcMain.handle("get-settings", async () => {
  return Storage.get("settings", {
    ram: 4,
    javaPath: "",
    gameDir: CONFIG.GAME_DIR,
    hideOnLaunch: true,
  });
});

ipcMain.handle("save-settings", async (event, settings) => {
  Storage.set("settings", settings);
  return true;
});

ipcMain.handle("get-system-ram", async () => {
  const totalMemBytes = os.totalmem();
  const totalMemGB = Math.floor(totalMemBytes / (1024 * 1024 * 1024));
  return totalMemGB;
});

ipcMain.handle("scan-game-folder", async () => {
  const result = {
    mods: [],
    resourcepacks: [],
    shaders: [],
  };

  try {
    const categories = Object.values(DIR_MAP);

    for (const category of categories) {
      const dirPath = path.join(CONFIG.GAME_DIR, category);

      try {
        const files = await fs.readdir(dirPath);

        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stat = await fs.stat(filePath);

          if (stat.isFile()) {
            const hash = await calculateFileHash(filePath);
            const key =
              Object.entries(DIR_MAP).find(([, v]) => v === category)?.[0] ||
              category;

            result[key].push({
              name: file,
              hash: hash,
              size: stat.size,
            });
          }
        }
      } catch (err) {}
    }
  } catch (err) {
    console.error("Scan error:", err);
  }

  return result;
});

ipcMain.handle("delete-file", async (event, category, filename) => {
  const filePath = path.join(
    CONFIG.GAME_DIR,
    DIR_MAP[category] || category,
    filename,
  );

  try {
    await fs.unlink(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("read-crash-log", async () => {
  const logPath = path.join(CONFIG.GAME_DIR, "logs/latest.log");
  try {
    const content = await fs.readFile(logPath, "utf-8");
    const lines = content.split("\n");
    return lines.slice(-100).join("\n");
  } catch (err) {
    return "Log faylini o'qib bo'lmadi: " + err.message;
  }
});

ipcMain.handle("save-playtime", async (event, serverId, seconds) => {
  Storage.set(`playtime.${serverId}`, seconds);
  return true;
});

ipcMain.handle("get-playtime", async (event, serverId) => {
  return Storage.get(`playtime.${serverId}`, 0);
});

ipcMain.handle(
  "download-file",
  async (event, category, filename, url, expectedHash) => {
    const dir = path.join(CONFIG.GAME_DIR, DIR_MAP[category] || category);
    if (!fsSync.existsSync(dir)) {
      fsSync.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, filename);

    // Retry logic (3 marta)
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (attempt > 1) {
          console.log(
            `[CyberCraft] Retrying download of ${filename} (Attempt ${attempt}/3)...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }

        const result = await downloadFileFromUrl(url, filePath, (progress) => {
          if (mainWindow) {
            mainWindow.webContents.send("download-progress", {
              filename,
              progress,
            });
          }
        });

        if (expectedHash) {
          const actualHash = await calculateFileHash(filePath);
          if (actualHash !== expectedHash) {
            await fs.unlink(filePath);
            return { success: false, error: "Hash mismatch" };
          }
        }

        return { success: true };
      } catch (err) {
        console.error(`Download error for ${filename}:`, err);
        lastError = err.message;
      }
    }

    return {
      success: false,
      error: lastError || "Download failed after 3 attempts",
    };
  },
);

ipcMain.handle("check-file-hash", async (event, category, filename) => {
  const filePath = path.join(
    CONFIG.GAME_DIR,
    DIR_MAP[category] || category,
    filename,
  );

  try {
    await fs.access(filePath);
    const hash = await calculateFileHash(filePath);
    const stat = await fs.stat(filePath);
    return { exists: true, hash, size: stat.size };
  } catch (err) {
    return { exists: false, hash: null, size: 0 };
  }
});

ipcMain.handle("open-file-dialog", async () => {
  return dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "Java Executable", extensions: ["exe"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
});

ipcMain.handle("open-folder-dialog", async () => {
  return dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
});

ipcMain.handle("check-java-version", async (event, javaPath) => {
  return await checkJavaVersion(javaPath);
});

ipcMain.handle("find-java-21", async () => {
  return await findJava21();
});

ipcMain.handle("launch-game", async (event, options) => {
  const { server, manifest, ram, javaPath, username, token } = options;
  const safeManifest = manifest || {
    loader: server?.loader || "vanilla",
    loaderVersion: server?.loader_version || null,
    minecraft: server?.minecraft_version || options.minecraftVersion || "1.20.4",
    address: server
      ? `${server.ip_address || "127.0.0.1"}:${server.port || 25565}`
      : undefined,
  };

  try {
    await ensureDirectories();

    let finalJavaPath = javaPath;

    if (finalJavaPath) {
      const javaCheck = await checkJavaVersion(finalJavaPath);
      if (!javaCheck.valid) {
        console.error(`[CyberCraft] Java check failed: ${javaCheck.error}`);
        return {
          success: false,
          error: `Java versiyasi noto'g'ri!\n\n${javaCheck.error}\n\nNeoForge 1.21+ uchun Java 21 kerak.\n\nYuklab olish: https://adoptium.net/temurin/releases/?version=21`,
          javaError: true,
        };
      }
      console.log(
        `[CyberCraft] Using user-specified Java ${javaCheck.version}: ${finalJavaPath}`,
      );
    } else {
      console.log("[CyberCraft] Searching for Java 21...");
      finalJavaPath = await findJava21();

      if (!finalJavaPath) {
        return {
          success: false,
          error: `Java 21 topilmadi!\n\nNeoForge 1.21+ uchun Java 21 o'rnatilishi kerak.\n\nYuklab olish: https://adoptium.net/temurin/releases/?version=21`,
          javaError: true,
        };
      }
      console.log(`[CyberCraft] Found Java 21: ${finalJavaPath}`);
    }

    const cybercraftArgs = [];
    if (token && server) {
      // Serverga ulanishdan oldin session yaratish
      try {
        console.log("[CyberCraft] Creating auth session before connecting...");
        const sessionResult = await createAuthSession(token);
        if (sessionResult.success) {
          console.log(`[CyberCraft] Auth session created for ${sessionResult.username}, expires in ${sessionResult.expires_in}s`);
        } else {
          console.warn(`[CyberCraft] Session creation failed: ${sessionResult.error}`);
        }
      } catch (sessionErr) {
        console.warn("[CyberCraft] Session creation error:", sessionErr.message);
        // Session yaratilmasa ham o'yinni ishga tushirish — server kick qiladi
      }
    } else if (!token) {
      console.warn(
        "[CyberCraft] No auth token provided - server may reject connection",
      );
    }

    const launchOptions = {
      authorization: {
        access_token: "0",
        client_token: "0",
        uuid: generateOfflineUUID(username),
        name: username,
        user_properties: "{}",
      },
      root: CONFIG.GAME_DIR,
      memory: {
        max: `${ram}G`,
        min: `${Math.max(1, Math.floor(ram / 2))}G`,
      },
      javaPath: finalJavaPath || undefined,
      customArgs: [
        ...cybercraftArgs,
        "--add-opens",
        "java.base/java.lang.invoke=ALL-UNNAMED",
        "--add-opens",
        "java.base/java.util.jar=ALL-UNNAMED",
        "--add-opens",
        "java.base/sun.security.ssl=ALL-UNNAMED",
        "--add-opens",
        "java.base/java.util=ALL-UNNAMED",
        "--add-opens",
        "java.base/java.lang=ALL-UNNAMED",
        "--add-opens",
        "java.base/java.lang.reflect=ALL-UNNAMED",
        "--add-opens",
        "java.base/java.text=ALL-UNNAMED",
        "--add-opens",
        "java.base/java.io=ALL-UNNAMED",
        "--add-opens",
        "java.base/java.net=ALL-UNNAMED",
        "--add-opens",
        "java.base/sun.net.www.protocol.https=ALL-UNNAMED",
        "--add-exports",
        "java.base/sun.security.util=ALL-UNNAMED",
        "--add-exports",
        "jdk.naming.dns/com.sun.jndi.dns=java.naming",
        "-XX:+UseG1GC",
        "-XX:+ParallelRefProcEnabled",
        "-XX:MaxGCPauseMillis=200",
        "-XX:+UnlockExperimentalVMOptions",
        "-XX:+DisableExplicitGC",
        "-XX:G1NewSizePercent=30",
        "-XX:G1MaxNewSizePercent=40",
        "-XX:G1HeapRegionSize=8M",
        "-XX:G1ReservePercent=20",
        "-XX:G1HeapWastePercent=5",
        "-XX:G1MixedGCCountTarget=4",
        "-XX:InitiatingHeapOccupancyPercent=15",
        "-XX:G1MixedGCLiveThresholdPercent=90",
        "-XX:G1RSetUpdatingPauseTimePercent=5",
        "-XX:SurvivorRatio=32",
        "-XX:+PerfDisableSharedMem",
        "-XX:MaxTenuringThreshold=1",
      ],
    };

    const loader = safeManifest.loader || "vanilla";
    const loaderVersion = safeManifest.loaderVersion;
    const mcVersion = safeManifest.minecraft;

    if (loader === "forge" && loaderVersion) {
      launchOptions.version = {
        number: mcVersion,
        type: "release",
      };
      launchOptions.forge = `${mcVersion}-${loaderVersion}`;

      console.log(
        `[CyberCraft] Using Forge ${loaderVersion} for MC ${mcVersion}`,
      );
    } else if (loader === "fabric" && loaderVersion) {
      launchOptions.version = {
        number: mcVersion,
        type: "release",
        custom: `fabric-loader-${loaderVersion}-${mcVersion}`,
      };

      console.log(
        `[CyberCraft] Using Fabric ${loaderVersion} for MC ${mcVersion}`,
      );
    } else if (loader === "neoforge" && loaderVersion) {
      const neoforgeVersionName = `neoforge-${loaderVersion}`;
      const versionDir = path.join(
        CONFIG.GAME_DIR,
        "versions",
        neoforgeVersionName,
      );
      const versionJsonPath = path.join(
        versionDir,
        `${neoforgeVersionName}.json`,
      );

      let neoforgeInstalled = false;
      try {
        await fs.access(versionJsonPath);
        neoforgeInstalled = true;
        console.log(`[CyberCraft] NeoForge ${loaderVersion} already installed`);
      } catch (err) {
        console.log(
          `[CyberCraft] NeoForge ${loaderVersion} not found, installing...`,
        );
      }

      if (!neoforgeInstalled) {
        if (mainWindow) {
          mainWindow.webContents.send("launch-progress", {
            type: "neoforge",
            task: 0,
            total: 100,
            percent: 0,
            status: "NeoForge yuklanmoqda...",
          });
        }

        try {
          await installNeoForge(mcVersion, loaderVersion, finalJavaPath);
          console.log(
            `[CyberCraft] NeoForge ${loaderVersion} installed successfully`,
          );
        } catch (installError) {
          console.error(
            `[CyberCraft] NeoForge installation failed:`,
            installError,
          );
          return {
            success: false,
            error: `NeoForge o'rnatishda xato: ${installError.message}\n\nQo'lda o'rnatish: https://neoforged.net/`,
          };
        }
      }

      console.log(
        `[CyberCraft] Using custom NeoForge launcher for ${loaderVersion}`,
      );

      try {
        gameProcess = await launchNeoForgeCustom({
          versionJsonPath,
          neoforgeVersionName,
          mcVersion,
          username,
          ram,
          javaPath: finalJavaPath,
          gameDir: CONFIG.GAME_DIR,
          cybercraftArgs,
          server,
        });

        gameProcess.on("error", (err) => {
          console.error("[CyberCraft] Game error:", err);
          mainWindow?.webContents.send("game-error", err.message);
        });

        gameProcess.on("close", (code) => {
          console.log("[CyberCraft] Game closed with code:", code);
          mainWindow?.webContents.send("game-closed", code);
          gameProcess = null;
        });

        return { success: true };
      } catch (launchError) {
        console.error("[CyberCraft] NeoForge launch failed:", launchError);
        return {
          success: false,
          error: `NeoForge ishga tushir ilmadi: ${launchError.message}`,
        };
      }
    } else {
      launchOptions.version = {
        number: mcVersion,
        type: "release",
      };

      console.log(`[CyberCraft] Using Vanilla MC ${mcVersion}`);
    }

    const serverAddress = server?.address || safeManifest.address;
    if (serverAddress) {
      const [host, port] = serverAddress.split(":");
      launchOptions.server = {
        host: host,
        port: port || "25565",
      };
      console.log(`[CyberCraft] Will connect to server: ${serverAddress}`);
    }

    console.log("[CyberCraft] Launching Minecraft with options:", {
      username,
      version: mcVersion,
      loader: loader,
      loaderVersion: loaderVersion,
      ram: `${ram}G`,
      server: serverAddress,
    });

    try {
      gameProcess = await launcher.launch(launchOptions);
    } catch (launchError) {
      console.error("[CyberCraft] Launch failed:", launchError);
      return {
        success: false,
        error: `O'yin ishga tushirilmadi: ${launchError.message}\n\nNeoForge/Forge versiyasini tekshiring yoki qayta o'rnatib ko'ring.`,
      };
    }

    if (!gameProcess) {
      console.error(
        "[CyberCraft] Game process is null - launch failed silently",
      );
      return {
        success: false,
        error:
          "O'yin jarayoni ishga tushmadi. Forge/NeoForge versiyalarini tekshiring.",
      };
    }

    gameProcess.on("error", (err) => {
      console.error("[CyberCraft] Game error:", err);
      mainWindow?.webContents.send("game-error", err.message);
    });

    gameProcess.on("close", (code) => {
      console.log("[CyberCraft] Game closed with code:", code);
      mainWindow?.webContents.send("game-closed", code);
      gameProcess = null;
    });

    return { success: true };
  } catch (err) {
    console.error("[CyberCraft] Launch error:", err);
    return { success: false, error: err.message };
  }
});

// =============================================
// CyberCraft Auth Session
// =============================================

function createAuthSession(token) {
  const url = `${CONFIG.API_BASE_URL}/api/minecraft/session/create/`;

  return new Promise((resolve) => {
    const protocol = url.startsWith("https") ? https : http;
    const urlObj = new URL(url);

    const postData = JSON.stringify({});

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Launcher ${token}`,
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = protocol.request(options, (response) => {
      let data = "";
      response.on("data", (chunk) => (data += chunk));
      response.on("end", () => {
        try {
          const result = JSON.parse(data);
          if (response.statusCode === 200) {
            resolve(result);
          } else {
            resolve({
              success: false,
              error: result.error || `HTTP ${response.statusCode}`,
            });
          }
        } catch (err) {
          resolve({ success: false, error: "JSON parse error" });
        }
      });
    });

    req.on("error", (err) => {
      console.error("[CyberCraft] Session create error:", err.message);
      resolve({ success: false, error: err.message });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ success: false, error: "Timeout" });
    });

    req.write(postData);
    req.end();
  });
}

// =============================================
// Auto-Update System
// =============================================

async function checkForUpdate() {
  const currentVersion = app.getVersion();
  const platform = process.platform;
  const url = `${CONFIG.API_BASE_URL}/api/launcher/update/?version=${currentVersion}&platform=${platform}`;

  console.log(
    `[CyberCraft] Checking for updates... (v${currentVersion}, ${platform})`,
  );

  return new Promise((resolve) => {
    const protocol = url.startsWith("https") ? https : http;

    protocol
      .get(url, (response) => {
        let data = "";
        response.on("data", (chunk) => (data += chunk));
        response.on("end", () => {
          try {
            const result = JSON.parse(data);
            console.log("[CyberCraft] Update check result:", result);
            resolve(result);
          } catch (err) {
            console.error("[CyberCraft] Update parse error:", err);
            resolve({ update_available: false });
          }
        });
      })
      .on("error", (err) => {
        console.error("[CyberCraft] Update check failed:", err.message);
        resolve({ update_available: false });
      });
  });
}

async function downloadUpdate(downloadUrl) {
  const tempDir = path.join(app.getPath("temp"), "cybercraft-update");
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (err) {}

  const ext =
    process.platform === "win32"
      ? ".exe"
      : process.platform === "darwin"
        ? ".dmg"
        : ".tar.gz";
  const filePath = path.join(tempDir, `CyberCraft-Setup${ext}`);

  console.log(`[CyberCraft] Downloading update to: ${filePath}`);

  return new Promise((resolve, reject) => {
    const protocol = downloadUrl.startsWith("https") ? https : http;

    const request = protocol.get(downloadUrl, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadUpdate(response.headers.location).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const totalSize = Number.parseInt(response.headers["content-length"], 10);
      let downloadedSize = 0;
      const chunks = [];

      response.on("data", (chunk) => {
        chunks.push(chunk);
        downloadedSize += chunk.length;
        if (totalSize && mainWindow) {
          const percent = Math.round((downloadedSize / totalSize) * 100);
          const downloadedMB = (downloadedSize / (1024 * 1024)).toFixed(1);
          const totalMB = (totalSize / (1024 * 1024)).toFixed(1);
          mainWindow.webContents.send("update-progress", {
            percent,
            downloadedMB,
            totalMB,
          });
        }
      });

      response.on("end", async () => {
        try {
          const buffer = Buffer.concat(chunks);
          await fs.writeFile(filePath, buffer);
          console.log(`[CyberCraft] Update downloaded: ${filePath}`);
          resolve(filePath);
        } catch (err) {
          reject(err);
        }
      });

      response.on("error", reject);
    });

    request.on("error", reject);
    request.setTimeout(300000, () => {
      request.destroy();
      reject(new Error("Download timeout"));
    });
  });
}

function installUpdate(filePath) {
  console.log(`[CyberCraft] Installing update from: ${filePath}`);
  shell.openPath(filePath);
  setTimeout(() => {
    app.quit();
  }, 1000);
}

// IPC handlers for update
ipcMain.handle("check-for-update", async () => {
  return await checkForUpdate();
});

ipcMain.handle("download-update", async (event, downloadUrl) => {
  try {
    const filePath = await downloadUpdate(downloadUrl);
    return { success: true, filePath };
  } catch (err) {
    console.error("[CyberCraft] Download update error:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("install-update", async (event, filePath) => {
  installUpdate(filePath);
  return { success: true };
});

ipcMain.handle("get-launcher-version", async () => {
  return app.getVersion();
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// --- Yo'q bo'lgan IPC handler'lar ---

ipcMain.handle("clear-cache", async () => {
  const dirs = ["mods", "resourcepacks", "shaderpacks"];
  for (const dir of dirs) {
    const dirPath = path.join(CONFIG.GAME_DIR, dir);
    try {
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        await fs.unlink(path.join(dirPath, file));
      }
    } catch (err) {}
  }
  return true;
});

ipcMain.handle("get-cache-size", async () => {
  let totalSize = 0;
  const dirs = ["mods", "resourcepacks", "shaderpacks"];
  for (const dir of dirs) {
    const dirPath = path.join(CONFIG.GAME_DIR, dir);
    try {
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        const stat = await fs.stat(path.join(dirPath, file));
        totalSize += stat.size;
      }
    } catch (err) {}
  }
  return totalSize;
});

ipcMain.handle("open-logs-folder", async () => {
  const logsDir = path.join(CONFIG.GAME_DIR, "logs");
  try {
    await fs.mkdir(logsDir, { recursive: true });
  } catch (err) {}
  shell.openPath(logsDir);
});

ipcMain.handle("open-game-folder", async () => {
  shell.openPath(CONFIG.GAME_DIR);
});

ipcMain.handle("set-auto-launch", async (event, enabled) => {
  app.setLoginItemSettings({ openAtLogin: enabled });
  return true;
});

ipcMain.handle("set-discord-rpc", async (event, enabled) => {
  // Discord RPC placeholder — hozircha faqat sozlama saqlanadi
  console.log(`[CyberCraft] Discord RPC ${enabled ? "enabled" : "disabled"}`);
  return true;
});

function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hashSum = crypto.createHash("sha256");
    const stream = fsSync.createReadStream(filePath);
    stream.on("data", (chunk) => hashSum.update(chunk));
    stream.on("end", () => resolve(hashSum.digest("hex")));
    stream.on("error", reject);
  });
}

async function ensureDirectories() {
  const dirs = [
    CONFIG.GAME_DIR,
    path.join(CONFIG.GAME_DIR, "mods"),
    path.join(CONFIG.GAME_DIR, "resourcepacks"),
    path.join(CONFIG.GAME_DIR, "shaderpacks"),
    path.join(CONFIG.GAME_DIR, "versions"),
    path.join(CONFIG.GAME_DIR, "libraries"),
    path.join(CONFIG.GAME_DIR, "assets"),
    path.join(CONFIG.GAME_DIR, "forge"),
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err) {}
  }
}

function generateOfflineUUID(username) {
  const md5 = crypto
    .createHash("md5")
    .update(`OfflinePlayer:${username}`)
    .digest("hex");
  return `${md5.substring(0, 8)}-${md5.substring(8, 12)}-${md5.substring(12, 16)}-${md5.substring(16, 20)}-${md5.substring(20, 32)}`;
}

async function checkJavaVersion(javaPath) {
  const javaCmd = javaPath || "java";

  return new Promise((resolve) => {
    exec(`"${javaCmd}" -version`, (error, stdout, stderr) => {
      if (error) {
        resolve({ valid: false, version: null, error: "Java topilmadi" });
        return;
      }

      const output = stderr || stdout;
      const versionMatch = output.match(/version "(\d+)(?:\.(\d+))?/);

      if (versionMatch) {
        const majorVersion = parseInt(versionMatch[1], 10);
        const isValid = majorVersion >= CONFIG.JAVA_MIN_VERSION;

        resolve({
          valid: isValid,
          version: majorVersion,
          error: isValid
            ? null
            : `Java ${CONFIG.JAVA_MIN_VERSION}+ kerak. Sizda Java ${majorVersion} o'rnatilgan.`,
        });
      } else {
        resolve({
          valid: false,
          version: null,
          error: "Java versiyasini aniqlab bo'lmadi",
        });
      }
    });
  });
}

// Java 21 ni avtomatik topish
async function findJava21() {
  console.log("[CyberCraft] Searching for Java 21...");

  // 1. Avval system PATH'dagi java ni tekshirish
  const systemJava = await checkJavaVersion("java");
  if (systemJava.valid) {
    console.log(`[CyberCraft] Found Java ${systemJava.version} in system PATH`);
    return "java";
  }
  console.log(`[CyberCraft] System Java: ${systemJava.error || "not found"}`);

  if (process.env.JAVA_HOME) {
    const javaHomePath = path.join(
      process.env.JAVA_HOME,
      "bin",
      process.platform === "win32" ? "java.exe" : "java",
    );
    try {
      await fs.access(javaHomePath);
      const check = await checkJavaVersion(javaHomePath);
      if (check.valid) {
        console.log(`[CyberCraft] Found Java ${check.version} in JAVA_HOME`);
        return javaHomePath;
      }
    } catch (err) {}
  }

  if (process.platform === "win32") {
    const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";

    const searchDirs = [
      path.join(programFiles, "Java"),
      path.join(programFiles, "Eclipse Adoptium"),
      path.join(programFiles, "Microsoft"),
      path.join(programFiles, "Zulu"),
      path.join(programFiles, "Amazon Corretto"),
      path.join(programFiles, "BellSoft"),
      path.join(programFiles, "Liberica"),
    ];

    for (const searchDir of searchDirs) {
      try {
        const entries = await fs.readdir(searchDir);
        for (const entry of entries) {
          if (
            entry.includes("21") ||
            entry.includes("-21") ||
            entry.toLowerCase().includes("jdk21")
          ) {
            const javaExe = path.join(searchDir, entry, "bin", "java.exe");
            try {
              await fs.access(javaExe);
              const check = await checkJavaVersion(javaExe);
              if (check.valid) {
                console.log(
                  `[CyberCraft] Found Java ${check.version} at ${javaExe}`,
                );
                return javaExe;
              }
            } catch (err) {}
          }
        }
      } catch (err) {}
    }

    try {
      const regOutput = execSync(
        'reg query "HKLM\\SOFTWARE\\JavaSoft\\JDK" /s 2>nul || reg query "HKLM\\SOFTWARE\\JavaSoft\\Java Development Kit" /s 2>nul',
        { encoding: "utf8" },
      );
      const javaHomeMatch = regOutput.match(/JavaHome\s+REG_SZ\s+(.+)/g);
      if (javaHomeMatch) {
        for (const match of javaHomeMatch) {
          const homePath = match.replace(/JavaHome\s+REG_SZ\s+/, "").trim();
          if (homePath.includes("21")) {
            const javaExe = path.join(homePath, "bin", "java.exe");
            try {
              await fs.access(javaExe);
              const check = await checkJavaVersion(javaExe);
              if (check.valid) {
                console.log(
                  `[CyberCraft] Found Java ${check.version} from Registry: ${javaExe}`,
                );
                return javaExe;
              }
            } catch (err) {}
          }
        }
      }
    } catch (err) {
      console.log("[CyberCraft] Registry search failed");
    }
  } else if (process.platform === "darwin") {
    const macPaths = [
      "/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home/bin/java",
      "/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home/bin/java",
      "/Library/Java/JavaVirtualMachines/zulu-21.jdk/Contents/Home/bin/java",
      "/usr/local/opt/openjdk@21/bin/java",
      "/opt/homebrew/opt/openjdk@21/bin/java",
    ];

    for (const javaPath of macPaths) {
      try {
        await fs.access(javaPath);
        const check = await checkJavaVersion(javaPath);
        if (check.valid) {
          console.log(
            `[CyberCraft] Found Java ${check.version} at ${javaPath}`,
          );
          return javaPath;
        }
      } catch (err) {}
    }
  } else {
    const linuxPaths = [
      "/usr/lib/jvm/java-21-openjdk/bin/java",
      "/usr/lib/jvm/java-21-openjdk-amd64/bin/java",
      "/usr/lib/jvm/temurin-21-jdk/bin/java",
      "/usr/lib/jvm/jdk-21/bin/java",
    ];

    for (const javaPath of linuxPaths) {
      try {
        await fs.access(javaPath);
        const check = await checkJavaVersion(javaPath);
        if (check.valid) {
          console.log(
            `[CyberCraft] Found Java ${check.version} at ${javaPath}`,
          );
          return javaPath;
        }
      } catch (err) {}
    }
  }

  console.log("[CyberCraft] Java 21 not found!");
  return null;
}

function downloadFileFromUrl(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    const request = protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFileFromUrl(response.headers.location, destPath, onProgress)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const totalSize = Number.parseInt(response.headers["content-length"], 10);
      let downloadedSize = 0;
      const chunks = [];

      response.on("data", (chunk) => {
        chunks.push(chunk);
        downloadedSize += chunk.length;
        if (totalSize && onProgress) {
          onProgress(Math.round((downloadedSize / totalSize) * 100));
        }
      });

      response.on("end", async () => {
        try {
          const buffer = Buffer.concat(chunks);
          await fs.writeFile(destPath, buffer);
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      response.on("error", reject);
    });

    request.on("error", reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error("Download timeout"));
    });
  });
}

async function installNeoForge(mcVersion, neoforgeVersion, javaPath) {
  console.log(
    `[CyberCraft] Installing NeoForge ${neoforgeVersion} for MC ${mcVersion}...`,
  );

  const installerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${neoforgeVersion}/neoforge-${neoforgeVersion}-installer.jar`;

  const tempDir = path.join(CONFIG.GAME_DIR, "temp");
  const installerPath = path.join(
    tempDir,
    `neoforge-${neoforgeVersion}-installer.jar`,
  );

  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (err) {}

  console.log(
    `[CyberCraft] Downloading NeoForge installer from: ${installerUrl}`,
  );

  const onProgress = (percent) => {
    if (mainWindow) {
      mainWindow.webContents.send("launch-progress", {
        type: "neoforge",
        task: percent,
        total: 100,
        percent: percent,
        status: `NeoForge yuklanmoqda... ${percent}%`,
      });
    }
  };

  await downloadFileFromUrl(installerUrl, installerPath, onProgress);

  console.log(
    `[CyberCraft] NeoForge installer downloaded, running installation...`,
  );

  const launcherProfilesPath = path.join(
    CONFIG.GAME_DIR,
    "launcher_profiles.json",
  );
  try {
    await fs.access(launcherProfilesPath);
  } catch (err) {
    const defaultProfiles = {
      profiles: {},
      settings: {},
      version: 3,
    };
    await fs.writeFile(
      launcherProfilesPath,
      JSON.stringify(defaultProfiles, null, 2),
    );
    console.log(
      `[CyberCraft] Created launcher_profiles.json for NeoForge installer`,
    );
  }

  if (mainWindow) {
    mainWindow.webContents.send("launch-progress", {
      type: "neoforge",
      task: 100,
      total: 100,
      percent: 100,
      status: "NeoForge o'rnatilmoqda...",
    });
  }

  return new Promise((resolve, reject) => {
    const javaCmd = javaPath || "java";

    const installerProcess = spawn(
      javaCmd,
      ["-jar", installerPath, "--installClient", CONFIG.GAME_DIR],
      {
        cwd: CONFIG.GAME_DIR,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    let output = "";
    let errorOutput = "";

    installerProcess.stdout.on("data", (data) => {
      output += data.toString();
      console.log(`[NeoForge Installer] ${data.toString().trim()}`);
    });

    installerProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
      console.log(`[NeoForge Installer ERR] ${data.toString().trim()}`);
    });

    installerProcess.on("close", async (code) => {
      try {
        await fs.unlink(installerPath);
      } catch (err) {}

      if (code === 0) {
        console.log(
          `[CyberCraft] NeoForge installation completed successfully`,
        );
        resolve();
      } else {
        console.error(
          `[CyberCraft] NeoForge installer exited with code ${code}`,
        );
        reject(
          new Error(
            `Installer xato bilan tugadi (kod: ${code}). ${errorOutput}`,
          ),
        );
      }
    });

    installerProcess.on("error", (err) => {
      console.error(`[CyberCraft] Failed to start NeoForge installer:`, err);
      reject(err);
    });

    setTimeout(() => {
      installerProcess.kill();
      reject(new Error("NeoForge o'rnatish vaqti tugadi (timeout)"));
    }, 600000);
  });
}
