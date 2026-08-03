const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sampLauncher", {
  getServers: () => ipcRenderer.invoke("get-servers"),
  addServer: (host, port) => ipcRenderer.invoke("add-server", { host, port }),
  removeServer: (host, port) => ipcRenderer.invoke("remove-server", { host, port }),
  getServerStatus: (host, port) => ipcRenderer.invoke("get-server-status", { host, port }),
  getServerPlayers: (host, port) => ipcRenderer.invoke("get-server-players", { host, port }),
  openExternalUrl: (url) => ipcRenderer.invoke("open-external-url", { url }),
  onUpdateAvailable: (callback) =>
    ipcRenderer.on("update-available", (event, data) => callback(data)),
  launchSamp: (host, port, playerName, serverInfo, serverPassword, sampVersion) =>
    ipcRenderer.invoke("launch-samp", {
      host,
      port,
      playerName,
      serverName: serverInfo && serverInfo.serverName,
      onlinePlayers: serverInfo && serverInfo.onlinePlayers,
      maxPlayers: serverInfo && serverInfo.maxPlayers,
      serverPassword: serverPassword || "",
      sampVersion: sampVersion || ""
    }),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (gtaSaDirectory) =>
    ipcRenderer.invoke("save-settings", { gtaSaDirectory }),
  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  saveTheme: (theme) => ipcRenderer.invoke("save-theme", { theme }),
  openDiscordServer: () => ipcRenderer.invoke("open-discord-server"),
  checkCleoInstalled: () => ipcRenderer.invoke("check-cleo-installed"),
  downloadCleo: () => ipcRenderer.invoke("download-cleo"),
  onCleoDownloadProgress: (callback) =>
    ipcRenderer.on("cleo-download-progress", (event, data) => callback(data)),
  checkModInstalled: (modId) => ipcRenderer.invoke("check-mod-installed", { modId }),
  downloadMod: (modId) => ipcRenderer.invoke("download-mod", { modId }),
  onModDownloadProgress: (callback) =>
    ipcRenderer.on("mod-download-progress", (event, data) => callback(data))
});