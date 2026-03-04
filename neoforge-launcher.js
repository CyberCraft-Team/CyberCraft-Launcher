const { spawn } = require("child_process");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

/**
 * Extract native libraries from JAR files
 */
async function extractNatives(versionData, libraryDir, nativesDir) {
  try {
    await fs.mkdir(nativesDir, { recursive: true });
  } catch (err) {}

  const platform = process.platform;
  const arch = process.arch;

  // Determine native classifier based on OS
  let nativeClassifier = "natives-linux";
  if (platform === "win32") {
    nativeClassifier = "natives-windows";
  } else if (platform === "darwin") {
    nativeClassifier =
      arch === "arm64" ? "natives-macos-arm64" : "natives-macos";
  }

  console.log(`[NeoForge] Extracting natives for ${nativeClassifier}...`);

  const nativeLibs = [];

  // Find native libraries from version JSON
  if (versionData.libraries) {
    for (const lib of versionData.libraries) {
      // Check if library has native classifiers
      if (lib.downloads && lib.downloads.classifiers) {
        const classifier = lib.downloads.classifiers[nativeClassifier];
        if (classifier) {
          const jarPath = path.join(libraryDir, classifier.path);
          nativeLibs.push(jarPath);
        }
      }

      // Also check for "-natives-" in artifact name
      if (lib.downloads && lib.downloads.artifact) {
        const artifactPath = lib.downloads.artifact.path;
        if (artifactPath && artifactPath.includes(`-${nativeClassifier}`)) {
          const jarPath = path.join(libraryDir, artifactPath);
          nativeLibs.push(jarPath);
        }
      }
    }
  }

  // Extract .so/.dll/.dylib files from each native jar
  for (const jarPath of nativeLibs) {
    try {
      if (!fsSync.existsSync(jarPath)) {
        console.log(`[NeoForge] Native jar not found: ${jarPath}`);
        continue;
      }

      const zip = new AdmZip(jarPath);
      const entries = zip.getEntries();

      for (const entry of entries) {
        const entryName = entry.entryName;

        // Extract only native library files
        if (
          entryName.endsWith(".so") ||
          entryName.endsWith(".dll") ||
          entryName.endsWith(".dylib") ||
          (entryName.endsWith(".sha1") === false &&
            entryName.includes("META-INF") === false)
        ) {
          if (
            entryName.endsWith(".so") ||
            entryName.endsWith(".dll") ||
            entryName.endsWith(".dylib")
          ) {
            const fileName = path.basename(entryName);
            const destPath = path.join(nativesDir, fileName);

            try {
              const content = zip.readFile(entry);
              await fs.writeFile(destPath, content);
            } catch (writeErr) {
              // File might already exist
            }
          }
        }
      }
    } catch (err) {
      console.error(`[NeoForge] Error extracting ${jarPath}:`, err.message);
    }
  }

  console.log(`[NeoForge] Extracted natives to ${nativesDir}`);
}

/**
 * Launch NeoForge using version JSON file
 */
async function launchNeoForgeCustom(options) {
  const {
    versionJsonPath,
    neoforgeVersionName,
    mcVersion,
    username,
    ram,
    javaPath,
    gameDir,
    cybercraftArgs = [],
    server = null,
  } = options;

  // Read NeoForge version JSON
  let versionData = JSON.parse(await fs.readFile(versionJsonPath, "utf8"));

  // If version inherits from parent, merge libraries
  if (versionData.inheritsFrom) {
    const parentJsonPath = path.join(
      path.dirname(versionJsonPath),
      `${versionData.inheritsFrom}.json`,
    );

    try {
      const parentData = JSON.parse(await fs.readFile(parentJsonPath, "utf8"));
      console.log(
        `[NeoForge] Merging with parent version: ${versionData.inheritsFrom}`,
      );

      // Merge libraries (deduplicate - child overrides parent)
      const libMap = new Map();
      for (const lib of parentData.libraries || []) {
        libMap.set(lib.name, lib);
      }
      for (const lib of versionData.libraries || []) {
        libMap.set(lib.name, lib); // Child overrides parent
      }
      versionData.libraries = Array.from(libMap.values());

      // Inherit assetIndex if not present
      if (!versionData.assetIndex && parentData.assetIndex) {
        versionData.assetIndex = parentData.assetIndex;
      }

      // Inherit mainClass if not present
      if (!versionData.mainClass && parentData.mainClass) {
        versionData.mainClass = parentData.mainClass;
      }

      // Merge arguments
      if (parentData.arguments) {
        if (parentData.arguments.jvm && !versionData.arguments?.jvm) {
          versionData.arguments = versionData.arguments || {};
          versionData.arguments.jvm = parentData.arguments.jvm;
        }
        if (parentData.arguments.game) {
          versionData.arguments = versionData.arguments || {};
          versionData.arguments.game = [
            ...(parentData.arguments.game || []),
            ...(versionData.arguments?.game || []),
          ];
        }
      }
    } catch (err) {
      console.error(`[NeoForge] Could not read parent JSON: ${err.message}`);
    }
  }

  // Variable replacements
  const libraryDir = path.join(gameDir, "libraries");
  const classpathSep = process.platform === "win32" ? ";" : ":";
  const nativesDir = path.join(gameDir, "natives");

  // Extract native libraries
  await extractNatives(versionData, libraryDir, nativesDir);

  // Parse JVM arguments from version JSON
  const jvmArgsTemplate = versionData.arguments.jvm || [];
  const gameArgsTemplate = versionData.arguments.game || [];

  const replaceVars = (arg) => {
    if (typeof arg !== "string") return arg;
    return arg
      .replace(/\$\{library_directory\}/g, libraryDir)
      .replace(/\$\{classpath_separator\}/g, classpathSep)
      .replace(/\$\{version_name\}/g, neoforgeVersionName)
      .replace(/\$\{natives_directory\}/g, nativesDir);
  };

  // Build JVM arguments
  const jvmArgs = [
    `-Xms${Math.max(1, Math.floor(ram / 2))}G`,
    `-Xmx${ram}G`,
    ...cybercraftArgs,
  ];

  // Add NeoForge-specific JVM args from JSON
  for (const arg of jvmArgsTemplate) {
    if (typeof arg === "string") {
      jvmArgs.push(replaceVars(arg));
    } else if (arg.rules) {
      // Skip conditional args for simplicity
      continue;
    } else if (arg.value) {
      if (Array.isArray(arg.value)) {
        arg.value.forEach((v) => jvmArgs.push(replaceVars(v)));
      } else {
        jvmArgs.push(replaceVars(arg.value));
      }
    }
  }

  // Build classpath from libraries
  const libraries = [];
  const currentOS =
    process.platform === "win32"
      ? "windows"
      : process.platform === "darwin"
        ? "osx"
        : "linux";

  if (versionData.libraries) {
    for (const lib of versionData.libraries) {
      // Check OS rules
      if (lib.rules) {
        let allowed = false;
        for (const rule of lib.rules) {
          if (rule.action === "allow") {
            if (!rule.os) {
              allowed = true;
            } else if (rule.os.name === currentOS) {
              allowed = true;
            }
          } else if (
            rule.action === "disallow" &&
            rule.os?.name === currentOS
          ) {
            allowed = false;
            break;
          }
        }
        if (!allowed) continue;
      }

      if (lib.downloads && lib.downloads.artifact) {
        const libPath = path.join(libraryDir, lib.downloads.artifact.path);
        libraries.push(libPath);
      }
    }
  }

  // Add client jar
  const clientJar = path.join(
    gameDir,
    "versions",
    neoforgeVersionName,
    `${neoforgeVersionName}.jar`,
  );
  libraries.push(clientJar);

  const classpath = libraries.join(classpathSep);

  jvmArgs.push("-cp", classpath);

  // Main class
  const mainClass = versionData.mainClass || "net.minecraft.client.main.Main";

  // Build game arguments
  const uuid = generateOfflineUUID(username);
  const gameArgs = [];

  for (const arg of gameArgsTemplate) {
    if (typeof arg === "string") {
      gameArgs.push(
        arg
          .replace(/\$\{auth_player_name\}/g, username)
          .replace(/\$\{version_name\}/g, neoforgeVersionName)
          .replace(/\$\{game_directory\}/g, gameDir)
          .replace(/\$\{assets_root\}/g, path.join(gameDir, "assets"))
          .replace(
            /\$\{assets_index_name\}/g,
            versionData.assetIndex?.id || mcVersion,
          )
          .replace(/\$\{auth_uuid\}/g, uuid)
          .replace(/\$\{auth_access_token\}/g, "0")
          .replace(/\$\{clientid\}/g, "0")
          .replace(/\$\{auth_xuid\}/g, "0")
          .replace(/\$\{user_type\}/g, "mojang")
          .replace(/\$\{version_type\}/g, versionData.type || "release"),
      );
    }
  }

  // Add server connection if provided
  if (server && server.address) {
    const [host, port] = server.address.split(":");
    gameArgs.push("--server", host);
    if (port) {
      gameArgs.push("--port", port);
    }
  }

  // Spawn process
  const args = [...jvmArgs, mainClass, ...gameArgs];

  console.log("[NeoForge Custom] Launching with:", {
    java: javaPath,
    mainClass,
    version: neoforgeVersionName,
    ram: `${ram}G`,
  });

  const gameProcess = spawn(javaPath, args, {
    cwd: gameDir,
    stdio: ["pipe", "pipe", "pipe"],
  });

  // Log output
  gameProcess.stdout.on("data", (data) => {
    console.log(`[Minecraft] ${data.toString().trim()}`);
  });

  gameProcess.stderr.on("data", (data) => {
    console.error(`[Minecraft Error] ${data.toString().trim()}`);
  });

  return gameProcess;
}

function generateOfflineUUID(username) {
  const crypto = require("crypto");
  const md5 = crypto
    .createHash("md5")
    .update(`OfflinePlayer:${username}`)
    .digest("hex");
  return `${md5.substring(0, 8)}-${md5.substring(8, 12)}-${md5.substring(12, 16)}-${md5.substring(16, 20)}-${md5.substring(20, 32)}`;
}

module.exports = { launchNeoForgeCustom };
