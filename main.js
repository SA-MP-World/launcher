const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn, exec } = require("child_process");
const https = require("https");
const http = require("http");
const crypto = require("crypto");
const { Client: DiscordRpcClient } = require("@xhayper/discord-rpc");
const { createExtractorFromFile } = require("node-unrar-js");
const AdmZip = require("adm-zip");

const CLEO_DOWNLOAD_URL = "https://raw.githubusercontent.com/derrick0930/mods-saworld/refs/heads/main/cleo.rar";
const CLEO_FOLDER_NAME = "CLEO";
const CLEO_ASI_NAME = "cleo.asi";
const CLEO_DOWNLOAD_MAX_REDIRECTS = 5;

const MOD_ZIP_DEFINITIONS = {
  codsmp: {
    url: "https://raw.githubusercontent.com/derrick0930/mods-saworld/refs/heads/main/codsmp.zip",
    checkFileName: "codsmp.asi",
    label: "COD SMP"
  },
  modloader: {
    url: "https://raw.githubusercontent.com/derrick0930/mods-saworld/refs/heads/main/modloader.zip",
    checkFileName: "modloader.asi",
    label: "ModLoader"
  }
};

app.setName("SAMP World");

let mainWindow = null;

const LOG_FILE_NAME = "SAMP-World.txt";
const MAX_LOG_SIZE_BYTES = 2 * 1024 * 1024;

function getLogPath() {
  try {
    const config = readConfig();
    if (config.gtaSaDirectory && fs.existsSync(config.gtaSaDirectory)) {
      return path.join(config.gtaSaDirectory, LOG_FILE_NAME);
    }
  } catch (err) { }
  return path.join(app.getPath("userData"), LOG_FILE_NAME);
}

function writeLog(level, message) {
  try {
    const logPath = getLogPath();
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      if (stats.size > MAX_LOG_SIZE_BYTES) {
        fs.writeFileSync(logPath, "", "utf8");
      }
    } else {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
    }
    const timestamp = new Date().toISOString();
    const line = "[" + timestamp + "] [" + level + "] " + message + "\n";
    fs.appendFileSync(logPath, line, "utf8");
  } catch (err) {
    console.error("Gagal menulis log ke " + LOG_FILE_NAME + ":", err.message);
  }
  if (level === "ERROR") {
    console.error(message);
  } else {
    console.log(message);
  }
}

const SERVERS_PATH = path.join(app.getPath("userData"), "servers.json");

function readServers() {
  try {
    if (fs.existsSync(SERVERS_PATH)) {
      const raw = fs.readFileSync(SERVERS_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item) => item && typeof item.host === "string" && typeof item.port === "number"
        );
      }
    }
  } catch (err) {
    console.error("Gagal membaca servers.json:", err.message);
  }
  return [];
}

function writeServers(servers) {
  try {
    fs.mkdirSync(path.dirname(SERVERS_PATH), { recursive: true });
    fs.writeFileSync(SERVERS_PATH, JSON.stringify(servers, null, 2), "utf8");
    return true;
  } catch (err) {
    writeLog("ERROR", "Gagal menyimpan servers.json: " + err.message);
    return false;
  }
}
const dgram = require("dgram");

function decodeSampString(buffer) {
  return buffer.toString("latin1");
}

function sendSampQuery(host, port, opcode, timeoutMs) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    const hostParts = host.split(".");
    const packet = Buffer.alloc(11);

    packet.write("SAMP", 0, "ascii");
    for (let i = 0; i < 4; i++) {
      packet[4 + i] = parseInt(hostParts[i], 10) || 0;
    }
    packet[8] = port & 0xff;
    packet[9] = (port >> 8) & 0xff;
    packet[10] = opcode.charCodeAt(0);

    const sentAt = Date.now();
    let settled = false;

    function finish(result) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch (err) { }
      resolve(result);
    }

    const timer = setTimeout(() => finish(null), timeoutMs || 1500);

    socket.on("message", (message) => {
      const ping = Date.now() - sentAt;

      if (message.length < 11) {
        finish(null);
        return;
      }

      finish({ body: message.slice(11), ping: ping });
    });

    socket.on("error", () => finish(null));

    try {
      socket.send(packet, 0, packet.length, port, host, (err) => {
        if (err) {
          finish(null);
        }
      });
    } catch (err) {
      finish(null);
    }
  });
}

async function queryServerInfo(host, port) {
  const result = await sendSampQuery(host, port, "i");
  if (!result) {
    return null;
  }

  try {
    const body = result.body;
    let offset = 0;

    const passworded = body.readUInt8(offset);
    offset += 1;

    const online = body.readUInt16LE(offset);
    offset += 2;

    const maxplayers = body.readUInt16LE(offset);
    offset += 2;

    let strlen = body.readUInt32LE(offset);
    offset += 4;
    const hostname = decodeSampString(body.slice(offset, offset + strlen));
    offset += strlen;

    strlen = body.readUInt32LE(offset);
    offset += 4;
    const gamemode = decodeSampString(body.slice(offset, offset + strlen));
    offset += strlen;

    strlen = body.readUInt32LE(offset);
    offset += 4;
    const language = decodeSampString(body.slice(offset, offset + strlen));
    offset += strlen;

    return {
      hostname: hostname,
      gamemode: gamemode,
      language: language,
      passworded: passworded === 1,
      maxplayers: maxplayers,
      online: online,
      ping: result.ping
    };
  } catch (err) {
    return null;
  }
}

async function queryServerRules(host, port) {
  const result = await sendSampQuery(host, port, "r");
  if (!result) {
    return null;
  }

  try {
    const body = result.body;
    let offset = 0;

    let ruleCount = body.readUInt16LE(offset);
    offset += 2;

    const rules = {};

    while (ruleCount > 0) {
      let strlen = body.readUInt8(offset);
      offset += 1;
      const property = decodeSampString(body.slice(offset, offset + strlen));
      offset += strlen;

      strlen = body.readUInt8(offset);
      offset += 1;
      const value = decodeSampString(body.slice(offset, offset + strlen));
      offset += strlen;

      rules[property] = value;
      ruleCount -= 1;
    }

    return rules;
  } catch (err) {
    return null;
  }
}

const PLAYER_QUERY_TIMEOUT_MS = 3000;

async function queryServerPlayersDetailed(host, port) {
  const result = await sendSampQuery(host, port, "d", PLAYER_QUERY_TIMEOUT_MS);
  if (!result) {
    return null;
  }

  const body = result.body;
  if (body.length < 2) {
    return [];
  }

  const playerCount = body.readUInt16LE(0);
  let offset = 2;

  const players = [];
  for (let i = 0; i < playerCount; i++) {
    // butuh minimal 1 byte id + 1 byte panjang nama
    if (offset + 2 > body.length) {
      break;
    }

    offset += 1; // player id byte, tidak dipakai di UI

    const nameLen = body.readUInt8(offset);
    offset += 1;

    // pastikan sisa buffer cukup untuk nama + score (4) + ping (4)
    if (offset + nameLen + 8 > body.length) {
      break;
    }

    const name = decodeSampString(body.slice(offset, offset + nameLen));
    offset += nameLen;

    const score = body.readInt32LE(offset);
    offset += 4;

    const ping = body.readInt32LE(offset);
    offset += 4;

    players.push({ name: name, score: score, ping: ping });
  }

  return players;
}

async function queryServerPlayersShort(host, port) {
  const result = await sendSampQuery(host, port, "c", PLAYER_QUERY_TIMEOUT_MS);
  if (!result) {
    return null;
  }

  const body = result.body;
  if (body.length < 2) {
    return [];
  }

  const playerCount = body.readUInt16LE(0);
  let offset = 2;

  const players = [];
  for (let i = 0; i < playerCount; i++) {
    // butuh minimal 1 byte panjang nama
    if (offset + 1 > body.length) {
      break;
    }

    const nameLen = body.readUInt8(offset);
    offset += 1;

    // pastikan sisa buffer cukup untuk nama + score (4 byte)
    if (offset + nameLen + 4 > body.length) {
      break;
    }

    const name = decodeSampString(body.slice(offset, offset + nameLen));
    offset += nameLen;

    const score = body.readInt32LE(offset);
    offset += 4;

    players.push({ name: name, score: score, ping: null });
  }

  return players;
}

async function fetchServerPlayers(host, port) {
  const [detailed, short] = await Promise.all([
    queryServerPlayersDetailed(host, port),
    queryServerPlayersShort(host, port)
  ]);

  const detailedCount = Array.isArray(detailed) ? detailed.length : -1;
  const shortCount = Array.isArray(short) ? short.length : -1;

  if (detailedCount < 0 && shortCount < 0) {
    return { connected: false, players: [] };
  }

  // pakai hasil yang paling banyak berhasil di-parse; 'd' punya score/ping jadi
  // diprioritaskan bila jumlahnya sama atau lebih lengkap dibanding 'c'.
  if (detailedCount >= shortCount) {
    return { connected: true, players: detailed, detailed: true };
  }

  return { connected: true, players: short, detailed: false };
}

const KNOWN_RULE_KEYS = ["mapname", "version", "weburl", "weather", "worldtime", "lagcomp"];

function extractCustomRules(rules) {
  const customRules = {};
  if (!rules || typeof rules !== "object") {
    return customRules;
  }
  for (const key of Object.keys(rules)) {
    if (KNOWN_RULE_KEYS.indexOf(key) === -1) {
      customRules[key] = rules[key];
    }
  }
  return customRules;
}

async function fetchServerStatus(host, port) {
  const info = await queryServerInfo(host, port);

  if (!info) {
    return { connected: false };
  }

  const rules = await queryServerRules(host, port);

  return {
    connected: true,
    serverName: info.hostname || "",
    gamemode: info.gamemode || "",
    language: info.language || "",
    mapname: rules && typeof rules.mapname === "string" ? rules.mapname : "",
    version: rules && typeof rules.version === "string" ? rules.version : "",
    weburl: rules && typeof rules.weburl === "string" ? rules.weburl : "",
    weather: rules && typeof rules.weather === "string" ? rules.weather : "",
    worldtime: rules && typeof rules.worldtime === "string" ? rules.worldtime : "",
    lagcomp: rules && typeof rules.lagcomp === "string" ? rules.lagcomp : "",
    customRules: extractCustomRules(rules),
    online: info.online,
    max: info.maxplayers,
    ping: info.ping,
    passworded: !!info.passworded
  };
}

const DISCORD_CLIENT_ID = "1522511223940186253";
const DISCORD_SERVER_URL = "https://discord.gg/b5wrXeehTm";
const DISCORD_DOWNLOAD_URL = "https://github.com/SA-MP-World/launcher/releases";
const DISCORD_LOGO_URL = "https://raw.githubusercontent.com/SA-MP-World/launcher/refs/heads/main/assets/logo.png";
const DISCORD_LOGO_SMALL = "https://i.imgur.com/NWUGCLE.png";
const DISCORD_ID_PATTERN = /^\d{15,25}$/;

const UPDATE_CHECK_REPO_OWNER = "SA-MP-World";
const UPDATE_CHECK_REPO_NAME = "launcher";
const UPDATE_CHECK_API_URL =
  "https://api.github.com/repos/" + UPDATE_CHECK_REPO_OWNER + "/" + UPDATE_CHECK_REPO_NAME + "/releases/latest";
const UPDATE_CHECK_RELEASES_PAGE_URL =
  "https://github.com/" + UPDATE_CHECK_REPO_OWNER + "/" + UPDATE_CHECK_REPO_NAME + "/releases";
const UPDATE_CHECK_TIMEOUT_MS = 8000;

function fetchLatestGithubRelease() {
  return new Promise((resolve, reject) => {
    const req = https.get(
      UPDATE_CHECK_API_URL,
      {
        headers: {
          "User-Agent": "SAMP-World-Launcher",
          Accept: "application/vnd.github+json"
        },
        timeout: UPDATE_CHECK_TIMEOUT_MS
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error("GitHub API status " + res.statusCode));
          return;
        }

        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("Timeout saat menghubungi GitHub API"));
    });
    req.on("error", (err) => reject(err));
  });
}

function isNewerVersion(latestVersion, currentVersion) {
  const clean = (v) => String(v || "").replace(/^v/i, "").split("-")[0];
  const latestParts = clean(latestVersion).split(".").map((n) => parseInt(n, 10) || 0);
  const currentParts = clean(currentVersion).split(".").map((n) => parseInt(n, 10) || 0);
  const maxLen = Math.max(latestParts.length, currentParts.length);

  for (let i = 0; i < maxLen; i++) {
    const l = latestParts[i] || 0;
    const c = currentParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

async function checkForUpdatesAndNotify() {
  try {
    const release = await fetchLatestGithubRelease();
    const latestTag = release && release.tag_name;
    const currentVersion = app.getVersion();

    if (!latestTag) {
      writeLog("WARN", "Update check: response GitHub tidak punya tag_name.");
      return;
    }

    writeLog("INFO", "Update check: versi terpasang " + currentVersion + ", versi terbaru di GitHub " + latestTag);

    if (!isNewerVersion(latestTag, currentVersion)) {
      return;
    }

    const releaseUrl = (release.html_url) || UPDATE_CHECK_RELEASES_PAGE_URL;
    const releaseNotes = release.body ? String(release.body).slice(0, 500) : "";

    writeLog("INFO", "Update tersedia: " + latestTag + " (versi terpasang " + currentVersion + ")");

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update-available", {
        latestVersion: latestTag,
        currentVersion: currentVersion,
        releaseUrl: releaseUrl,
        releaseNotes: releaseNotes
      });
    }
  } catch (err) {

    writeLog("WARN", "Update check gagal: " + err.message);
  }
}



const DISCORD_ACTIVITY_REFRESH_MS = 5000;
const DISCORD_JOIN_GRACE_PERIOD_MS = 45000;

let discordClient = null;
let discordReady = false;
let discordConfigured = false;
let discordLastError = "";
let activityStartTimestamp = null;
let discordRetryTimer = null;

let activeSession = null; // { host, port, playerName }
let activityRefreshTimer = null;
let hasSeenPlayerOnline = false;
let sessionJoinedAt = null;

function connectDiscordClient(clientId) {
  if (discordClient) {
    try {
      discordClient.destroy();
    } catch (err) { }
  }

  discordClient = new DiscordRpcClient({
    clientId: clientId,
    transport: "ipc"
  });

  discordClient.on("ready", () => {
    discordReady = true;
    discordLastError = "";
    writeLog("INFO", "Discord Rich Presence terhubung.");
  });

  discordClient.on("disconnected", () => {
    discordReady = false;
    writeLog("WARN", "Discord Rich Presence terputus.");
  });

  discordClient.login().catch((err) => {
    discordReady = false;
    discordLastError = err.message;
    writeLog("WARN", "Discord Rich Presence belum terhubung (Discord mungkin belum dibuka): " + err.message);
  });
}

function initDiscordRpc() {
  const trimmedId = (DISCORD_CLIENT_ID || "").trim();
  discordConfigured = DISCORD_ID_PATTERN.test(trimmedId);

  if (!discordConfigured) {
    discordLastError =
      'DISCORD_CLIENT_ID tidak valid. Nilai saat ini: "' +
      trimmedId +
      '". Client ID Discord harus berupa angka 15-25 digit.';
    writeLog("WARN", "Discord Rich Presence dilewati: " + discordLastError);
    return;
  }

  connectDiscordClient(trimmedId);

  if (discordRetryTimer) {
    clearInterval(discordRetryTimer);
  }

  discordRetryTimer = setInterval(() => {
    if (!discordReady && discordConfigured) {
      connectDiscordClient(trimmedId);
    }
  }, 20000);
}

function setDiscordPlayingActivity(host, port, serverName, onlinePlayers, maxPlayers) {
  if (!discordReady || !discordClient || !discordClient.user) {
    return;
  }

  if (!activityStartTimestamp) {
    activityStartTimestamp = Date.now();
  }

  const safeServerName = serverName || host + ":" + port;
  const safeOnline = typeof onlinePlayers === "number" && !isNaN(onlinePlayers) ? onlinePlayers : 0;
  const safeMax = typeof maxPlayers === "number" && !isNaN(maxPlayers) ? maxPlayers : 0;

  const activityPayload = {
    details: safeServerName,
    state: host + ":" + port,
    startTimestamp: activityStartTimestamp,
    instance: false
  };

  const trimmedLogoUrl = (DISCORD_LOGO_URL || "").trim();
  const trimmedLogoSmall = (DISCORD_LOGO_SMALL || "").trim();
  if (trimmedLogoUrl.indexOf("https://") === 0) {
    activityPayload.largeImageKey = trimmedLogoUrl;
    activityPayload.largeImageText = "SA:MP World";
    activityPayload.smallImageKey = trimmedLogoSmall;
    activityPayload.smallImageText = safeOnline + "/" + safeMax + " Players";
  }

  const buttons = [];
  const trimmedServerUrl = (DISCORD_SERVER_URL || "").trim();
  const trimmedDownloadUrl = (DISCORD_DOWNLOAD_URL || "").trim();

  if (trimmedServerUrl.indexOf("https://") === 0) {
    buttons.push({ label: "Join Server", url: trimmedServerUrl });
  }
  if (trimmedDownloadUrl.indexOf("https://") === 0) {
    buttons.push({ label: "Download Launcher", url: trimmedDownloadUrl });
  }
  if (buttons.length > 0) {
    activityPayload.buttons = buttons;
  }

  discordClient.user.setActivity(activityPayload).catch((err) => {
    writeLog("ERROR", "Gagal mengatur Discord activity: " + err.message);
  });
}

function startDiscordActivityAutoRefresh() {
  if (activityRefreshTimer) {
    clearInterval(activityRefreshTimer);
  }

  activityRefreshTimer = setInterval(async () => {
    if (!activeSession) {
      clearInterval(activityRefreshTimer);
      activityRefreshTimer = null;
      return;
    }

    const status = await fetchServerStatus(activeSession.host, activeSession.port);
    if (status) {
      setDiscordPlayingActivity(activeSession.host, activeSession.port, status.serverName, status.online, status.max);
    }

    if (!activeSession.playerName) {
      return;
    }

    const playersResult = await fetchServerPlayers(activeSession.host, activeSession.port);
    if (!playersResult || !playersResult.connected) {
      return;
    }

    const normalizedPlayerName = activeSession.playerName.toLowerCase();
    const isPlayerListed =
      Array.isArray(playersResult.players) &&
      playersResult.players.some(
        (player) => typeof player.name === "string" && player.name.toLowerCase() === normalizedPlayerName
      );

    if (isPlayerListed) {
      hasSeenPlayerOnline = true;
      return;
    }

    if (hasSeenPlayerOnline) {
      writeLog("INFO", activeSession.playerName + " sudah tidak terdaftar di server, menghapus Discord Rich Presence.");
      clearDiscordActivity();
      return;
    }

    if (sessionJoinedAt && Date.now() - sessionJoinedAt >= DISCORD_JOIN_GRACE_PERIOD_MS) {
      writeLog("INFO", activeSession.playerName + " tidak pernah terdeteksi masuk ke server, menghapus Discord Rich Presence.");
      clearDiscordActivity();
    }
  }, DISCORD_ACTIVITY_REFRESH_MS);
}

function stopDiscordActivityAutoRefresh() {
  if (activityRefreshTimer) {
    clearInterval(activityRefreshTimer);
    activityRefreshTimer = null;
  }
}

function clearDiscordActivity() {
  activityStartTimestamp = null;
  activeSession = null;
  hasSeenPlayerOnline = false;
  sessionJoinedAt = null;
  stopDiscordActivityAutoRefresh();

  if (!discordReady || !discordClient || !discordClient.user) {
    return;
  }

  discordClient.user.clearActivity().catch((err) => {
    writeLog("ERROR", "Gagal menghapus Discord activity: " + err.message);
  });
}

const GTA_PROCESS_NAME = "gta_sa.exe";
const GTA_MONITOR_GRACE_PERIOD_MS = 20000;
const GTA_MONITOR_POLL_INTERVAL_MS = 8000;

function isGtaProcessRunning(callback) {
  if (process.platform !== "win32") {
    callback(true);
    return;
  }

  exec('tasklist /FI "IMAGENAME eq ' + GTA_PROCESS_NAME + '" /NH', (err, stdout) => {
    if (err) {
      console.error("Gagal menjalankan tasklist untuk cek proses game:", err.message);
      callback(false);
      return;
    }
    const output = (stdout || "").toLowerCase();
    callback(output.indexOf(GTA_PROCESS_NAME) !== -1);
  });
}

function monitorGtaProcessForDiscord() {
  console.log("Mulai memantau proses " + GTA_PROCESS_NAME + " untuk Discord Rich Presence.");

  setTimeout(() => {
    let hasSeenGtaProcess = false;

    const pollTimer = setInterval(() => {
      if (!activeSession) {
        clearInterval(pollTimer);
        return;
      }

      isGtaProcessRunning((isRunning) => {
        if (isRunning) {
          if (!hasSeenGtaProcess) {
            console.log(GTA_PROCESS_NAME + " terdeteksi berjalan.");
          }
          hasSeenGtaProcess = true;
          return;
        }

        if (hasSeenGtaProcess) {
          console.log(GTA_PROCESS_NAME + " sudah tidak berjalan, menghapus Discord Rich Presence.");
          clearInterval(pollTimer);
          clearDiscordActivity();
        }
      });
    }, GTA_MONITOR_POLL_INTERVAL_MS);
  }, GTA_MONITOR_GRACE_PERIOD_MS);
}

const CONFIG_PATH = path.join(app.getPath("userData"), "config.json");

const SESSION_START_URL = "https://samp.derrick.web.id/api/session-start";
const SESSION_HEARTBEAT_URL = "https://samp.derrick.web.id/api/session-heartbeat";
const SESSION_STOP_URL = "https://samp.derrick.web.id/api/session-stop";
const SESSION_HEARTBEAT_INTERVAL_MS = 30000;

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf8");
      const parsed = JSON.parse(raw);
      return {
        gtaSaDirectory: typeof parsed.gtaSaDirectory === "string" ? parsed.gtaSaDirectory : "",
        lastUsername: typeof parsed.lastUsername === "string" ? parsed.lastUsername : "",
        serverUsernames: parsed.serverUsernames && typeof parsed.serverUsernames === "object" ? parsed.serverUsernames : {},
        theme: parsed.theme === "light" ? "light" : "dark",
        deviceId: typeof parsed.deviceId === "string" ? parsed.deviceId : ""
      };
    }
  } catch (err) {
    console.error("Gagal membaca config.json:", err.message);
  }
  return { gtaSaDirectory: "", lastUsername: "", serverUsernames: {}, theme: "dark", deviceId: "" };
}

function getOrCreateDeviceId() {
  const config = readConfig();
  if (config.deviceId && typeof config.deviceId === "string" && config.deviceId.trim()) {
    return config.deviceId.trim();
  }
  const newDeviceId = crypto.randomBytes(3).toString("hex").toUpperCase();
  writeConfig({ deviceId: newDeviceId });
  return newDeviceId;
}

function sendSessionPostRequest(urlStr, deviceId) {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlStr);
      const postData = JSON.stringify({ device_id: deviceId });
      const isHttps = url.protocol === "https:";
      const transport = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port ? parseInt(url.port, 10) : (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        },
        timeout: 10000
      };

      const req = transport.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, status: res.statusCode, body: body });
          } else {
            resolve({ success: false, status: res.statusCode, body: body });
          }
        });
      });

      req.on("error", (err) => {
        resolve({ success: false, error: err.message });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({ success: false, error: "Timeout" });
      });

      req.write(postData);
      req.end();
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
}

let sessionHeartbeatTimer = null;

async function sendSessionStart() {
  const deviceId = getOrCreateDeviceId();
  writeLog("INFO", "Mengirimkan session-start untuk device_id: " + deviceId);
  const result = await sendSessionPostRequest(SESSION_START_URL, deviceId);
  if (result.success) {
    writeLog("INFO", "Session-start berhasil dicatat untuk device_id: " + deviceId);
  } else {
    writeLog("WARN", "Session-start gagal: " + (result.error || ("HTTP " + result.status)));
  }
}

async function sendSessionHeartbeat() {
  const deviceId = getOrCreateDeviceId();
  const result = await sendSessionPostRequest(SESSION_HEARTBEAT_URL, deviceId);
  if (!result.success) {
    writeLog("WARN", "Session-heartbeat gagal: " + (result.error || ("HTTP " + result.status)));
  }
}

async function sendSessionStop() {
  const deviceId = getOrCreateDeviceId();
  writeLog("INFO", "Mengirimkan session-stop untuk device_id: " + deviceId);
  await sendSessionPostRequest(SESSION_STOP_URL, deviceId);
}

function initSessionTracker() {
  sendSessionStart();

  if (sessionHeartbeatTimer) {
    clearInterval(sessionHeartbeatTimer);
  }

  sessionHeartbeatTimer = setInterval(() => {
    sendSessionHeartbeat();
  }, SESSION_HEARTBEAT_INTERVAL_MS);
}

function stopSessionTracker() {
  if (sessionHeartbeatTimer) {
    clearInterval(sessionHeartbeatTimer);
    sessionHeartbeatTimer = null;
  }
  sendSessionStop();
}

function writeConfig(partialConfig) {
  try {
    const currentConfig = readConfig();
    const mergedConfig = Object.assign({}, currentConfig, partialConfig);
    if (partialConfig && partialConfig.serverUsernames) {
      mergedConfig.serverUsernames = Object.assign({}, currentConfig.serverUsernames, partialConfig.serverUsernames);
    }
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(mergedConfig, null, 2), "utf8");
    return true;
  } catch (err) {
    writeLog("ERROR", "Gagal menyimpan config.json: " + err.message);
    return false;
  }
}

const NICKNAME_PATTERN = /^[A-Za-z0-9_\[\]]{3,20}$/;
const SAMP_VERSION_FOLDER_MAP = {
  "0.3.7-R1": "037-R1",
  "0.3.7-R2": "037-R2",
  "0.3.7-R3": "037-R3",
  "0.3.7-R3-1": "037-R3-1",
  "0.3.7-R4": "037-R4",
  "0.3.7-R5": "037-R5",
  "0.3.DL": "03DL"
};
const DEFAULT_SAMP_VERSION = "0.3.DL";

function resolveVersionDllPath(sampVersion) {
  const folder = SAMP_VERSION_FOLDER_MAP[sampVersion];
  if (!folder) {
    return null;
  }
  const base = app.isPackaged
    ? path.join(process.resourcesPath, "bin", "versions")
    : path.join(__dirname, "bin", "versions");
  return path.join(base, folder, "samp.dll");
}

function resolveSharedFilesDir() {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, "bin", "shared")
    : path.join(__dirname, "bin", "shared");
  return base;
}

function copyMissingSharedFiles(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    return;
  }
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyMissingSharedFiles(srcPath, destPath);
    } else if (!fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function ensureSharedFilesInstalled(gtaSaDirectory) {
  const sharedDir = resolveSharedFilesDir();
  try {
    copyMissingSharedFiles(sharedDir, gtaSaDirectory);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

const CUSTOM_SHARED_ASSETS = ["mouse.png", "sampgui.png"];

function ensureCustomSharedAssetsInstalled(gtaSaDirectory) {
  const sharedDir = resolveSharedFilesDir();
  for (const fileName of CUSTOM_SHARED_ASSETS) {
    const srcPath = path.join(sharedDir, fileName);
    const destPath = path.join(gtaSaDirectory, fileName);

    if (!fs.existsSync(srcPath)) {
      return { success: false, message: fileName + " tidak ditemukan di: " + srcPath };
    }

    try {
      fs.copyFileSync(srcPath, destPath);
    } catch (err) {
      return { success: false, message: "Gagal menyalin " + fileName + ": " + err.message };
    }
  }
  return { success: true };
}

function resolveClientDllPath() {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, "bin", "client")
    : path.join(__dirname, "bin", "client");
  return path.join(base, "saworld-client.dll");
}

function resolveAnticheatDir() {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, "bin", "AC")
    : path.join(__dirname, "bin", "AC");
  return base;
}

function ensureAnticheatInstalled(gtaSaDirectory) {
  const anticheatDir = resolveAnticheatDir();
  const srcPath = path.join(anticheatDir, "FileDetect.asi");
  const destPath = path.join(gtaSaDirectory, "FileDetect.asi");

  if (!fs.existsSync(srcPath)) {
    return { success: false, message: "FileDetect.asi tidak ditemukan di: " + srcPath };
  }

  try {
    fs.copyFileSync(srcPath, destPath);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function isCleoInstalled(gtaSaDirectory) {
  try {
    const cleoFolderPath = path.join(gtaSaDirectory, CLEO_FOLDER_NAME);
    const cleoAsiPath = path.join(gtaSaDirectory, CLEO_ASI_NAME);
    const folderOk = fs.existsSync(cleoFolderPath) && fs.statSync(cleoFolderPath).isDirectory();
    const asiOk = fs.existsSync(cleoAsiPath) && fs.statSync(cleoAsiPath).isFile();
    return folderOk && asiOk;
  } catch (err) {
    return false;
  }
}

function downloadFileWithProgress(url, destPath, onProgress, redirectCount) {
  return new Promise((resolve, reject) => {
    const currentRedirectCount = redirectCount || 0;

    if (currentRedirectCount > CLEO_DOWNLOAD_MAX_REDIRECTS) {
      reject(new Error("Terlalu banyak redirect saat mendownload file"));
      return;
    }

    const request = https.get(
      url,
      { headers: { "User-Agent": "SAMP-World-Launcher" } },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          downloadFileWithProgress(res.headers.location, destPath, onProgress, currentRedirectCount + 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error("Gagal mendownload file (status " + res.statusCode + ")"));
          return;
        }

        const totalBytes = parseInt(res.headers["content-length"], 10) || 0;
        let downloadedBytes = 0;

        const fileStream = fs.createWriteStream(destPath);

        res.on("data", (chunk) => {
          downloadedBytes += chunk.length;
          if (typeof onProgress === "function") {
            onProgress(downloadedBytes, totalBytes);
          }
        });

        res.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close(() => resolve());
        });

        fileStream.on("error", (err) => {
          reject(err);
        });

        res.on("error", (err) => {
          reject(err);
        });
      }
    );

    request.on("error", (err) => {
      reject(err);
    });
  });
}

async function extractRarFile(rarFilePath, targetDirectory) {
  const extractor = await createExtractorFromFile({
    filepath: rarFilePath,
    targetPath: targetDirectory
  });

  const extracted = extractor.extract();
  for (const file of extracted.files) {
    void file;
  }
}

function extractZipFile(zipFilePath, targetDirectory) {
  const zip = new AdmZip(zipFilePath);
  zip.extractAllTo(targetDirectory, true);
}

function isModZipInstalled(gtaSaDirectory, modId) {
  const def = MOD_ZIP_DEFINITIONS[modId];
  if (!def) {
    return false;
  }
  try {
    const filePath = path.join(gtaSaDirectory, def.checkFileName);
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

async function downloadAndInstallModZip(modId) {
  const def = MOD_ZIP_DEFINITIONS[modId];
  if (!def) {
    return { success: false, message: "Mod tidak dikenal: " + modId };
  }

  const config = readConfig();
  const gtaSaDirectory = config.gtaSaDirectory;

  if (!gtaSaDirectory || !fs.existsSync(gtaSaDirectory)) {
    return {
      success: false,
      message: "Directory GTA SA belum diatur. Silakan atur lewat menu Setting terlebih dahulu."
    };
  }

  if (isModZipInstalled(gtaSaDirectory, modId)) {
    writeLog("INFO", def.label + " sudah terinstall, download dilewati.");
    return { success: true, alreadyInstalled: true };
  }

  function sendProgress(payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("mod-download-progress", Object.assign({ modId: modId }, payload));
    }
  }

  const tempZipPath = path.join(app.getPath("temp"), "sampworld-" + modId + "-" + Date.now() + ".zip");

  try {
    sendProgress({ stage: "downloading", percent: 0, downloadedBytes: 0, totalBytes: 0 });

    await downloadFileWithProgress(def.url, tempZipPath, (downloadedBytes, totalBytes) => {
      const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
      sendProgress({ stage: "downloading", percent: percent, downloadedBytes: downloadedBytes, totalBytes: totalBytes });
    });

    writeLog("INFO", def.label + " berhasil didownload ke: " + tempZipPath);

    sendProgress({ stage: "extracting", percent: 100 });

    extractZipFile(tempZipPath, gtaSaDirectory);

    try {
      fs.unlinkSync(tempZipPath);
    } catch (err) { }

    if (!isModZipInstalled(gtaSaDirectory, modId)) {
      const message =
        "File " + def.label + " sudah diekstrak, tapi " + def.checkFileName + " tidak ditemukan di directory GTA SA. Periksa isi archive-nya.";
      writeLog("WARN", message);
      sendProgress({ stage: "error", message: message });
      return { success: false, message: message };
    }

    writeLog("INFO", def.label + " berhasil diinstall ke: " + gtaSaDirectory);
    sendProgress({ stage: "done", percent: 100 });

    return { success: true };
  } catch (err) {
    try {
      if (fs.existsSync(tempZipPath)) {
        fs.unlinkSync(tempZipPath);
      }
    } catch (cleanupErr) { }

    writeLog("ERROR", "Gagal mendownload/install " + def.label + ": " + err.message);
    sendProgress({ stage: "error", message: err.message });

    return { success: false, message: "Gagal mendownload/install " + def.label + ": " + err.message };
  }
}

function setSampPlayerNameRegistry(playerName) {
  return new Promise((resolve) => {
    if (process.platform !== "win32") {
      resolve({ success: true, skipped: true });
      return;
    }

    const regProcess = spawn(
      "reg",
      ["add", "HKCU\\SOFTWARE\\SAMP", "/v", "PlayerName", "/t", "REG_SZ", "/d", playerName, "/f"],
      { windowsHide: true }
    );

    regProcess.on("error", (err) => {
      writeLog("ERROR", "Gagal menjalankan reg.exe: " + err.message);
      resolve({ success: false, skipped: false });
    });

    regProcess.on("close", (code) => {
      resolve({ success: code === 0, skipped: false });
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 760,
    useContentSize: true,
    minWidth: 1280,
    minHeight: 760,
    maxWidth: 1280,
    maxHeight: 760,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    backgroundColor: "#0f1115",
    icon: path.join(__dirname, "assets", "icon.ico"),
    title: "SA:MP World",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    checkForUpdatesAndNotify();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function applyPendingGtaSaPathFromInstaller() {
  const markerPath = path.join(app.getPath("userData"), "pending-gtasa-path.txt");
  if (!fs.existsSync(markerPath)) {
    return;
  }

  try {
    const gtaSaDirectory = fs.readFileSync(markerPath, "utf8").trim();
    if (gtaSaDirectory && fs.existsSync(path.join(gtaSaDirectory, "gta_sa.exe"))) {
      writeConfig({ gtaSaDirectory });
      const sharedResult = ensureSharedFilesInstalled(gtaSaDirectory);
      if (!sharedResult.success) {
        writeLog("WARN", "Gagal menyiapkan shared files dari path installer: " + sharedResult.message);
      }
      writeLog("INFO", "Directory GTA SA dari installer diterapkan otomatis: " + gtaSaDirectory);
    } else {
      writeLog("WARN", "Path GTA SA dari installer tidak valid, dilewati: " + gtaSaDirectory);
    }
  } catch (err) {
    writeLog("ERROR", "Gagal membaca pending-gtasa-path.txt: " + err.message);
  } finally {
    try {
      fs.unlinkSync(markerPath);
    } catch (err) {
    }
  }
}

app.whenReady().then(() => {
  writeLog("INFO", "==================== SA:MP World dibuka ====================");
  applyPendingGtaSaPathFromInstaller();
  createWindow();
  initDiscordRpc();
  initSessionTracker();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    writeLog("INFO", "Launcher ditutup.");
    app.quit();
  }
});

app.on("before-quit", () => {
  stopSessionTracker();
  if (discordClient) {
    try {
      discordClient.destroy();
    } catch (err) {
      writeLog("ERROR", "Gagal menutup koneksi Discord: " + err.message);
    }
  }
});

ipcMain.handle("get-servers", async () => {
  return readServers();
});

ipcMain.handle("add-server", async (event, payload) => {
  const host = payload && payload.host ? String(payload.host).trim() : "";
  const port = payload && payload.port ? parseInt(payload.port, 10) : NaN;

  if (!host) {
    return { success: false, message: "IP/Host tidak boleh kosong" };
  }

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return { success: false, message: "Port tidak valid" };
  }

  const servers = readServers();
  const alreadyExists = servers.some((item) => item.host === host && item.port === port);
  if (alreadyExists) {
    return { success: false, message: "Server ini sudah ada di daftar" };
  }

  const status = await fetchServerStatus(host, port);
  if (!status || !status.connected) {
    return {
      success: false,
      message: "Server tidak dapat dihubungi. Periksa kembali IP dan Port-nya."
    };
  }

  servers.push({ host: host, port: port });
  const saved = writeServers(servers);

  if (!saved) {
    return { success: false, message: "Gagal menyimpan server" };
  }

  writeLog("INFO", "Server ditambahkan ke daftar: " + host + ":" + port);

  return { success: true, servers: servers };
});

ipcMain.handle("remove-server", async (event, payload) => {
  const host = payload && payload.host ? String(payload.host).trim() : "";
  const port = payload && payload.port ? parseInt(payload.port, 10) : NaN;

  let servers = readServers();
  servers = servers.filter((item) => !(item.host === host && item.port === port));
  writeServers(servers);

  writeLog("INFO", "Server dihapus dari daftar: " + host + ":" + port);

  return { success: true, servers: servers };
});

ipcMain.handle("get-server-status", async (event, payload) => {
  const host = payload && payload.host ? String(payload.host).trim() : "";
  const port = payload && payload.port ? parseInt(payload.port, 10) : NaN;

  if (!host || !Number.isInteger(port)) {
    return null;
  }

  return fetchServerStatus(host, port);
});

ipcMain.handle("get-server-players", async (event, payload) => {
  const host = payload && payload.host ? String(payload.host).trim() : "";
  const port = payload && payload.port ? parseInt(payload.port, 10) : NaN;

  if (!host || !Number.isInteger(port)) {
    return { connected: false, players: [] };
  }

  return fetchServerPlayers(host, port);
});

ipcMain.handle("open-external-url", async (event, payload) => {
  const url = payload && payload.url ? String(payload.url).trim() : "";

  if (!/^https?:\/\//i.test(url)) {
    return { success: false, message: "URL tidak valid" };
  }

  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err) {
    writeLog("ERROR", "Gagal membuka link eksternal: " + err.message);
    return { success: false, message: "Gagal membuka link: " + err.message };
  }
});

ipcMain.handle("launch-samp", async (event, payload) => {
  const host = payload && payload.host ? String(payload.host).trim() : "";
  const port = payload && payload.port ? parseInt(payload.port, 10) : NaN;
  const playerName = payload && payload.playerName ? String(payload.playerName).trim() : "";
  const serverName = payload && payload.serverName ? String(payload.serverName) : "";
  const onlinePlayers = payload && typeof payload.onlinePlayers === "number" ? payload.onlinePlayers : 0;
  const maxPlayers = payload && typeof payload.maxPlayers === "number" ? payload.maxPlayers : 0;
  const serverPassword = payload && payload.serverPassword ? String(payload.serverPassword) : "";
  const sampVersion = payload && payload.sampVersion && SAMP_VERSION_FOLDER_MAP[payload.sampVersion]
    ? payload.sampVersion
    : DEFAULT_SAMP_VERSION;

  if (!host || !Number.isInteger(port)) {
    return { success: false, message: "Server tujuan tidak valid" };
  }

  if (!playerName) {
    return { success: false, message: "Username tidak boleh kosong" };
  }

  if (!NICKNAME_PATTERN.test(playerName)) {
    return {
      success: false,
      message: "Username hanya boleh huruf, angka, underscore, dan kurung siku [ ], panjang 3-20 karakter"
    };
  }

  const serverKey = host + ":" + port;
  writeConfig({
    lastUsername: playerName,
    lastSampVersion: sampVersion,
    serverUsernames: { [serverKey]: playerName }
  });

  const config = readConfig();
  const gtaSaDirectory = config.gtaSaDirectory;

  if (!gtaSaDirectory) {
    writeLog("WARN", "Percobaan connect gagal: directory GTA SA belum diatur.");
    return {
      success: false,
      message: "Directory GTA SA belum diatur. Silakan atur lewat menu Setting."
    };
  }

  const launcherPath = app.isPackaged
    ? path.join(process.resourcesPath, "bin", "samp_launcher.exe")
    : path.join(__dirname, "bin", "samp_launcher.exe");

  if (!fs.existsSync(launcherPath)) {
    writeLog("ERROR", "samp_launcher.exe tidak ditemukan di: " + launcherPath);
    return {
      success: false,
      message: "samp_launcher.exe tidak ditemukan. Coba install ulang aplikasi."
    };
  }

  const sharedResult = ensureSharedFilesInstalled(gtaSaDirectory);
  if (!sharedResult.success) {
    writeLog("ERROR", "Gagal menyiapkan file shared SAMP: " + sharedResult.message);
    return {
      success: false,
      message: "Gagal menyiapkan file pendukung SAMP: " + sharedResult.message
    };
  }

  const customAssetsResult = ensureCustomSharedAssetsInstalled(gtaSaDirectory);
  if (!customAssetsResult.success) {
    writeLog("ERROR", "Gagal menyiapkan mouse.png/sampgui.png: " + customAssetsResult.message);
    return {
      success: false,
      message: "Gagal menyiapkan mouse.png/sampgui.png: " + customAssetsResult.message
    };
  }

  const anticheatResult = ensureAnticheatInstalled(gtaSaDirectory);
  if (!anticheatResult.success) {
    writeLog("ERROR", "Gagal menyiapkan anticheat FileDetect.asi: " + anticheatResult.message);
    return {
      success: false,
      message: "Gagal menyiapkan anticheat FileDetect.asi: " + anticheatResult.message
    };
  }

  const versionDllPath = resolveVersionDllPath(sampVersion);
  if (!versionDllPath || !fs.existsSync(versionDllPath)) {
    writeLog("ERROR", "samp.dll untuk versi " + sampVersion + " tidak ditemukan di: " + versionDllPath);
    return {
      success: false,
      message: "File samp.dll untuk versi " + sampVersion + " tidak ditemukan. Coba install ulang aplikasi."
    };
  }

  const sampDllPath = path.join(gtaSaDirectory, "samp.dll");
  try {
    fs.copyFileSync(versionDllPath, sampDllPath);
  } catch (err) {
    writeLog("ERROR", "Gagal menyalin samp.dll versi " + sampVersion + " ke folder GTA SA: " + err.message);
    return {
      success: false,
      message: "Gagal menyiapkan samp.dll versi " + sampVersion + ": " + err.message
    };
  }

  const regResult = await setSampPlayerNameRegistry(playerName);
  if (!regResult.success && !regResult.skipped) {
    writeLog(
      "WARN",
      "Gagal menulis nickname ke registry. samp.exe kemungkinan akan memakai nickname lama dari sesi sebelumnya."
    );
  }

  try {
    const clientDllPath = resolveClientDllPath();
    const clientDllAvailable = fs.existsSync(clientDllPath);
    if (!clientDllAvailable) {
      writeLog("WARN", "saworld-client.dll tidak ditemukan di: " + clientDllPath + " (lanjut tanpa modul tambahan).");
    }
    const launcherArgs = [
      playerName,
      host,
      String(port),
      gtaSaDirectory,
      serverPassword,
      "",
      clientDllAvailable ? clientDllPath : ""
    ];

    const child = spawn(launcherPath, launcherArgs, {
      cwd: gtaSaDirectory,
      detached: true,
      stdio: "ignore"
    });

    child.on("error", (err) => {
      writeLog("ERROR", "Gagal menjalankan samp_launcher.exe: " + err.message);
    });

    child.unref();

    writeLog(
      "INFO",
      "samp_launcher.exe dijalankan (PID " + child.pid + ") versi " + sampVersion + " untuk connect ke " + host + ":" + port + " sebagai " + playerName + "."
    );

    activeSession = { host: host, port: port, playerName: playerName };
    hasSeenPlayerOnline = false;
    sessionJoinedAt = Date.now();
    setDiscordPlayingActivity(host, port, serverName, onlinePlayers, maxPlayers);
    startDiscordActivityAutoRefresh();
    monitorGtaProcessForDiscord();

    return {
      success: true,
      message: "Menyambungkan sebagai " + playerName + " ke server..."
    };
  } catch (error) {
    writeLog("ERROR", "Exception saat menjalankan samp_launcher.exe: " + error.message);
    return {
      success: false,
      message: "Gagal menjalankan samp_launcher.exe: " + error.message
    };
  }
});

ipcMain.handle("get-settings", async () => {
  return readConfig();
});

ipcMain.handle("save-settings", async (event, payload) => {
  const gtaSaDirectory = payload && payload.gtaSaDirectory ? String(payload.gtaSaDirectory).trim() : "";

  if (!gtaSaDirectory) {
    return { success: false, message: "Directory GTA SA tidak boleh kosong" };
  }

  if (!fs.existsSync(gtaSaDirectory)) {
    return { success: false, message: "Directory yang dipilih tidak ditemukan" };
  }

  const gtaExeCheck = path.join(gtaSaDirectory, "gta_sa.exe");
  if (!fs.existsSync(gtaExeCheck)) {
    return {
      success: false,
      message: "gta_sa.exe tidak ditemukan di directory tersebut. Pastikan ini folder instalasi GTA San Andreas."
    };
  }

  const saved = writeConfig({ gtaSaDirectory });

  if (!saved) {
    return { success: false, message: "Gagal menyimpan pengaturan" };
  }

  const sharedResult = ensureSharedFilesInstalled(gtaSaDirectory);
  if (!sharedResult.success) {
    writeLog("WARN", "Gagal menyiapkan file shared SAMP saat save-settings: " + sharedResult.message);
  }

  writeLog("INFO", "Directory GTA SA disimpan: " + gtaSaDirectory);

  return { success: true, message: "Directory GTA SA berhasil disimpan", gtaSaDirectory };
});

ipcMain.handle("open-discord-server", async () => {
  const url = (DISCORD_SERVER_URL || "").trim();

  if (url.indexOf("https://") !== 0) {
    return { success: false, message: "Link Discord server belum diatur di main.js" };
  }

  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err) {
    writeLog("ERROR", "Gagal membuka link Discord server: " + err.message);
    return { success: false, message: "Gagal membuka Discord: " + err.message };
  }
});

ipcMain.handle("save-theme", async (event, payload) => {
  const theme = payload && payload.theme === "light" ? "light" : "dark";
  writeConfig({ theme: theme });
  return { success: true, theme: theme };
});

ipcMain.handle("check-cleo-installed", async () => {
  const config = readConfig();
  const gtaSaDirectory = config.gtaSaDirectory;

  if (!gtaSaDirectory || !fs.existsSync(gtaSaDirectory)) {
    return { installed: false, gtaSaDirectory: "" };
  }

  return { installed: isCleoInstalled(gtaSaDirectory), gtaSaDirectory: gtaSaDirectory };
});

ipcMain.handle("download-cleo", async () => {
  const config = readConfig();
  const gtaSaDirectory = config.gtaSaDirectory;

  if (!gtaSaDirectory || !fs.existsSync(gtaSaDirectory)) {
    return {
      success: false,
      message: "Directory GTA SA belum diatur. Silakan atur lewat menu Setting terlebih dahulu."
    };
  }

  if (isCleoInstalled(gtaSaDirectory)) {
    writeLog("INFO", "CLEO 4 sudah terinstall, download dilewati.");
    return { success: true, alreadyInstalled: true };
  }

  function sendProgress(payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("cleo-download-progress", payload);
    }
  }

  const tempRarPath = path.join(app.getPath("temp"), "sampworld-cleo-" + Date.now() + ".rar");

  try {
    sendProgress({ stage: "downloading", percent: 0, downloadedBytes: 0, totalBytes: 0 });

    await downloadFileWithProgress(CLEO_DOWNLOAD_URL, tempRarPath, (downloadedBytes, totalBytes) => {
      const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
      sendProgress({ stage: "downloading", percent: percent, downloadedBytes: downloadedBytes, totalBytes: totalBytes });
    });

    writeLog("INFO", "CLEO 4 berhasil didownload ke: " + tempRarPath);

    sendProgress({ stage: "extracting", percent: 100 });

    await extractRarFile(tempRarPath, gtaSaDirectory);

    try {
      fs.unlinkSync(tempRarPath);
    } catch (err) {
      // gagal hapus file sementara bukan hal fatal
    }

    if (!isCleoInstalled(gtaSaDirectory)) {
      const message =
        "File CLEO 4 sudah diekstrak, tapi folder CLEO/cleo.asi tidak ditemukan di directory GTA SA. Periksa isi archive-nya.";
      writeLog("WARN", message);
      sendProgress({ stage: "error", message: message });
      return { success: false, message: message };
    }

    writeLog("INFO", "CLEO 4 berhasil diinstall ke: " + gtaSaDirectory);
    sendProgress({ stage: "done", percent: 100 });

    return { success: true };
  } catch (err) {
    try {
      if (fs.existsSync(tempRarPath)) {
        fs.unlinkSync(tempRarPath);
      }
    } catch (cleanupErr) {
      // abaikan gagal cleanup
    }

    writeLog("ERROR", "Gagal mendownload/install CLEO 4: " + err.message);
    sendProgress({ stage: "error", message: err.message });

    return { success: false, message: "Gagal mendownload/install CLEO 4: " + err.message };
  }
});

ipcMain.handle("check-mod-installed", async (event, payload) => {
  const modId = payload && payload.modId;
  const config = readConfig();
  const gtaSaDirectory = config.gtaSaDirectory;

  if (!MOD_ZIP_DEFINITIONS[modId]) {
    return { installed: false, gtaSaDirectory: "" };
  }

  if (!gtaSaDirectory || !fs.existsSync(gtaSaDirectory)) {
    return { installed: false, gtaSaDirectory: "" };
  }

  return { installed: isModZipInstalled(gtaSaDirectory, modId), gtaSaDirectory: gtaSaDirectory };
});

ipcMain.handle("download-mod", async (event, payload) => {
  const modId = payload && payload.modId;
  return downloadAndInstallModZip(modId);
});

ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Pilih Directory GTA San Andreas",
    properties: ["openDirectory"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, directory: "" };
  }

  return { canceled: false, directory: result.filePaths[0] };
});

function getChatlogPath() {
  const documentsPath = app.getPath("documents");
  return path.join(documentsPath, "GTA San Andreas User Files", "SAMP", "chatlog.txt");
}

ipcMain.handle("get-chatlog", async () => {
  const filePath = getChatlogPath();
  try {
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        exists: false,
        filePath: filePath,
        content: "",
        message: "File chatlog.txt belum ditemukan. Jalankan SA-MP terlebih dahulu."
      };
    }
    const content = fs.readFileSync(filePath, "utf8");
    return { success: true, exists: true, filePath: filePath, content: content };
  } catch (err) {
    writeLog("ERROR", "Gagal membaca chatlog: " + err.message);
    return {
      success: false,
      exists: false,
      filePath: filePath,
      content: "",
      message: "Gagal membaca chatlog: " + err.message
    };
  }
});

ipcMain.handle("save-chatlog", async (event, payload) => {
  const filePath = getChatlogPath();
  const content = payload && typeof payload.content === "string" ? payload.content : "";
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
    writeLog("INFO", "Chatlog berhasil disimpan ke: " + filePath);
    return { success: true, filePath: filePath, message: "Chatlog berhasil disimpan" };
  } catch (err) {
    writeLog("ERROR", "Gagal menyimpan chatlog: " + err.message);
    return { success: false, message: "Gagal menyimpan chatlog: " + err.message };
  }
});

ipcMain.handle("open-chatlog-folder", async () => {
  const filePath = getChatlogPath();
  const dirPath = path.dirname(filePath);
  try {
    if (fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
    } else {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      await shell.openPath(dirPath);
    }
    return { success: true };
  } catch (err) {
    writeLog("ERROR", "Gagal membuka folder chatlog: " + err.message);
    return { success: false, message: "Gagal membuka folder: " + err.message };
  }
});