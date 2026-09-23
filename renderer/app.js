(function () {
  "use strict";

  const STATUS_REFRESH_INTERVAL_MS = 15000;
  const NICKNAME_PATTERN = /^[A-Za-z0-9_\[\]]{3,20}$/;

  const modalOverlay = document.getElementById("modal-overlay");
  const cancelBtn = document.getElementById("cancel-btn");
  const connectBtn = document.getElementById("connect-btn");
  const usernameInput = document.getElementById("username-input");
  const sampVersionSelect = document.getElementById("samp-version-select");
  const errorMessage = document.getElementById("error-message");
  const modalServerIpEl = document.getElementById("modal-server-ip");
  const toast = document.getElementById("toast");

  const passwordModalOverlay = document.getElementById("password-modal-overlay");
  const passwordCancelBtn = document.getElementById("password-cancel-btn");
  const passwordConnectBtn = document.getElementById("password-connect-btn");
  const serverPasswordInput = document.getElementById("server-password-input");
  const passwordErrorMessage = document.getElementById("password-error-message");
  const passwordModalServerIpEl = document.getElementById("password-modal-server-ip");


  const settingsBtn = document.getElementById("settings-btn");
  const settingsModalOverlay = document.getElementById("settings-modal-overlay");
  const settingsCancelBtn = document.getElementById("settings-cancel-btn");
  const settingsSaveBtn = document.getElementById("settings-save-btn");
  const browseBtn = document.getElementById("browse-btn");
  const directoryInput = document.getElementById("directory-input");
  const settingsErrorMessage = document.getElementById("settings-error-message");
  const repairBtn = document.getElementById("repair-btn");
  const repairFileList = document.getElementById("repair-file-list");
  const repairModalOverlay = document.getElementById("repair-modal-overlay");
  const repairModalFileList = document.getElementById("repair-modal-file-list");
  const repairModalProgressWrap = document.getElementById("repair-modal-progress-wrap");
  const repairModalProgressFill = document.getElementById("repair-modal-progress-fill");
  const repairModalStatusText = document.getElementById("repair-modal-status-text");
  const repairModalPercentText = document.getElementById("repair-modal-percent-text");
  const repairModalCancelBtn = document.getElementById("repair-modal-cancel-btn");
  const repairModalConfirmBtn = document.getElementById("repair-modal-confirm-btn");
  const discordServerBtn = document.getElementById("discord-server-btn");
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const themeToggleIcon = document.getElementById("theme-toggle-icon");

  const addServerBtn = document.getElementById("add-server-btn");
  const addServerModalOverlay = document.getElementById("add-server-modal-overlay");
  const addServerCancelBtn = document.getElementById("add-server-cancel-btn");
  const addServerConfirmBtn = document.getElementById("add-server-confirm-btn");
  const addServerIpInput = document.getElementById("add-server-ip-input");
  const addServerErrorMessage = document.getElementById("add-server-error-message");

  const serversTableBody = document.getElementById("servers-table-body");
  const serversEmptyState = document.getElementById("servers-empty-state");
  const sortableHeaders = document.querySelectorAll(".sortable-th");
  const serversTabButtons = document.querySelectorAll(".servers-tab-btn");
  const serversTableWrapper = document.querySelector(".servers-table-wrapper");
  const serversTabsHint = document.getElementById("servers-tabs-hint");

  const modsPanel = document.getElementById("mods-panel");
  const cleoDownloadBtn = document.getElementById("cleo-download-btn");
  const cleoProgressWrapper = document.getElementById("cleo-progress-wrapper");
  const cleoProgressFill = document.getElementById("cleo-progress-fill");
  const cleoProgressLabel = document.getElementById("cleo-progress-label");

  const codsmpDownloadBtn = document.getElementById("codsmp-download-btn");
  const codsmpProgressWrapper = document.getElementById("codsmp-progress-wrapper");
  const codsmpProgressFill = document.getElementById("codsmp-progress-fill");
  const codsmpProgressLabel = document.getElementById("codsmp-progress-label");

  const modloaderDownloadBtn = document.getElementById("modloader-download-btn");
  const modloaderProgressWrapper = document.getElementById("modloader-progress-wrapper");
  const modloaderProgressFill = document.getElementById("modloader-progress-fill");
  const modloaderProgressLabel = document.getElementById("modloader-progress-label");

  const chatlogPanel = document.getElementById("chatlog-panel");
  const chatlogPathLabel = document.getElementById("chatlog-path-label");
  const chatlogTextarea = document.getElementById("chatlog-textarea");
  const chatlogRefreshBtn = document.getElementById("chatlog-refresh-btn");
  const chatlogCopyBtn = document.getElementById("chatlog-copy-btn");
  const chatlogFolderBtn = document.getElementById("chatlog-folder-btn");
  const chatlogSaveBtn = document.getElementById("chatlog-save-btn");
  const chatlogStatusInfo = document.getElementById("chatlog-status-info");

  const serverSidebar = document.getElementById("server-sidebar");
  const sidebarCloseBtn = document.getElementById("sidebar-close-btn");
  const sidebarServerName = document.getElementById("sidebar-server-name");
  const sidebarServerIp = document.getElementById("sidebar-server-ip");
  const sidebarStatPlayers = document.getElementById("sidebar-stat-players");
  const sidebarStatPing = document.getElementById("sidebar-stat-ping");
  const sidebarStatStatus = document.getElementById("sidebar-stat-status");
  const sidebarGamemode = document.getElementById("sidebar-gamemode");
  const sidebarMapEl = document.getElementById("sidebar-map");
  const sidebarLanguageEl = document.getElementById("sidebar-language");
  const sidebarVersion = document.getElementById("sidebar-version");
  const sidebarLocked = document.getElementById("sidebar-locked");
  const sidebarMax = document.getElementById("sidebar-max");
  const sidebarWeatherEl = document.getElementById("sidebar-weather");
  const sidebarWorldtimeEl = document.getElementById("sidebar-worldtime");
  const sidebarLagcompEl = document.getElementById("sidebar-lagcomp");
  const sidebarInfoGrid = document.getElementById("sidebar-info-grid");
  const sidebarWebsiteBtn = document.getElementById("sidebar-website-btn");
  const sidebarPingChart = document.getElementById("sidebar-ping-chart");
  const sidebarPlayerCount = document.getElementById("sidebar-player-count");
  const sidebarPlayerList = document.getElementById("sidebar-player-list");
  const sidebarConnectBtn = document.getElementById("sidebar-connect-btn");
  const sidebarRemoveBtn = document.getElementById("sidebar-remove-btn");

  const updateModalOverlay = document.getElementById("update-modal-overlay");
  const updateModalLatestVersion = document.getElementById("update-modal-latest-version");
  const updateModalCurrentVersion = document.getElementById("update-modal-current-version");
  const updateModalNotes = document.getElementById("update-modal-notes");
  const updateModalLaterBtn = document.getElementById("update-modal-later-btn");
  const updateModalDownloadBtn = document.getElementById("update-modal-download-btn");

  const RECOMMENDED_SERVERS = [{ host: "51.254.139.153", port: 7777 }];

  const SIDEBAR_REFRESH_INTERVAL_MS = 3000;
  const PING_HISTORY_MAX = 40;

  let toastTimeout = null;
  let savedServers = [];
  let statusCache = {};
  let selectedServer = null;
  let pendingPlayerName = "";
  let pendingSampVersion = "";
  let currentSortKey = null;
  let currentSortDirection = "asc";
  let currentTab = "favorite";

  let sidebarSelected = null;
  let sidebarRefreshTimer = null;
  let pingHistory = [];
  let rowClickTimer = null;
  let lastClickedRowKey = null;
  let pendingUpdateReleaseUrl = "";
  let sidebarCurrentWebsiteUrl = "";

  function serverKey(host, port) {
    return host + ":" + port;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
  }

  async function loadServers() {
    try {
      savedServers = await window.sampLauncher.getServers();
    } catch (err) {
      savedServers = [];
    }
    renderServersTable();
    refreshAllServerStatuses();
  }

  function buildOfflineStatus(key, previous) {
    if (previous) {
      return Object.assign({}, previous, { online: false });
    }
    return {
      online: false,
      name: key,
      gamemode: "-",
      mapname: "-",
      language: "-",
      version: "-",
      weburl: "",
      weather: "-",
      worldtime: "-",
      lagcomp: "-",
      customRules: previous && previous.customRules ? previous.customRules : {},
      onlineCount: 0,
      maxCount: 0,
      ping: null,
      locked: null
    };
  }

  function buildOnlineStatus(key, status) {
    return {
      online: true,
      name: status.serverName || key,
      gamemode: status.gamemode || "-",
      mapname: status.mapname || "-",
      language: status.language || "-",
      version: status.version || "-",
      weburl: typeof status.weburl === "string" ? status.weburl : "",
      weather: status.weather || "-",
      worldtime: status.worldtime || "-",
      lagcomp: status.lagcomp || "-",
      customRules: status.customRules && typeof status.customRules === "object" ? status.customRules : {},
      onlineCount: typeof status.online === "number" ? status.online : 0,
      maxCount: typeof status.max === "number" ? status.max : 0,
      ping: typeof status.ping === "number" ? status.ping : null,
      locked: typeof status.passworded === "boolean" ? status.passworded : false
    };
  }

  async function fetchAndCacheServerStatus(host, port) {
    const key = serverKey(host, port);
    const previous = statusCache[key];

    try {
      const status = await window.sampLauncher.getServerStatus(host, port);

      if (status && status.connected) {
        statusCache[key] = buildOnlineStatus(key, status);
      } else {
        statusCache[key] = buildOfflineStatus(key, previous);
      }
    } catch (err) {
      statusCache[key] = buildOfflineStatus(key, previous);
    }
  }

  async function refreshAllServerStatuses() {
    const combinedServers = savedServers.concat(RECOMMENDED_SERVERS);
    await Promise.all(combinedServers.map((srv) => fetchAndCacheServerStatus(srv.host, srv.port)));
    renderServersTable();
  }

  function getActiveServerList() {
    return currentTab === "recommended" ? RECOMMENDED_SERVERS : savedServers;
  }

  function getSortedServers() {
    const list = getActiveServerList().slice();

    function statusOf(srv) {
      return (
        statusCache[serverKey(srv.host, srv.port)] || {
          onlineCount: 0,
          ping: null,
          name: serverKey(srv.host, srv.port),
          version: "-",
          gamemode: "-",
          locked: null
        }
      );
    }

    if (!currentSortKey) {
      return list;
    }

    const dir = currentSortDirection === "asc" ? 1 : -1;

    list.sort((a, b) => {
      const sa = statusOf(a);
      const sb = statusOf(b);

      if (currentSortKey === "players") {
        return (sa.onlineCount - sb.onlineCount) * dir;
      }

      if (currentSortKey === "ping") {
        const pa = sa.ping;
        const pb = sb.ping;
        if (pa === null || pa === undefined) return 1;
        if (pb === null || pb === undefined) return -1;
        return (pa - pb) * dir;
      }

      if (currentSortKey === "locked") {
        const la = sa.locked === true ? 1 : 0;
        const lb = sb.locked === true ? 1 : 0;
        return (la - lb) * dir;
      }

      const va = String(sa[currentSortKey] || "").toLowerCase();
      const vb = String(sb[currentSortKey] || "").toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });


    return list;
  }

  function renderServersTable() {
    serversTableBody.innerHTML = "";

    if (getActiveServerList().length === 0) {
      serversEmptyState.style.display = "block";
      serversEmptyState.innerHTML =
        currentTab === "recommended"
          ? "Belum ada server rekomendasi."
          : 'Belum ada server ditambahkan.<br />Klik ikon "+" di pojok kanan atas untuk menambahkan server.';
      updateSidebarRemoveButtonVisibility();
      return;
    }
    serversEmptyState.style.display = "none";

    const isFavoriteTab = currentTab === "favorite";

    getSortedServers().forEach((srv) => {
      const key = serverKey(srv.host, srv.port);
      const status = statusCache[key] || buildOfflineStatus(key, null);

      const tr = document.createElement("tr");
      const isSelectedRow =
        sidebarSelected && sidebarSelected.host === srv.host && sidebarSelected.port === srv.port;
      tr.className =
        "server-row" +
        (status.online ? "" : " server-row--offline") +
        (isSelectedRow ? " server-row--selected" : "");
      tr.dataset.host = srv.host;
      tr.dataset.port = String(srv.port);

      const playersText = status.onlineCount + " / " + status.maxCount;
      const pingText = status.ping !== null && status.ping !== undefined ? status.ping + " ms" : "-";
      const offlineBadge = status.online ? "" : '<span class="offline-badge">Offline</span>';

      let lockIconHtml =
        '<span class="lock-icon lock-icon--unknown" title="Status password tidak diketahui">' +
        LOCK_ICON_UNKNOWN_SVG +
        "</span>";
      if (status.locked === true) {
        lockIconHtml =
          '<span class="lock-icon lock-icon--locked" title="Server terkunci (perlu password)">' +
          LOCK_ICON_LOCKED_SVG +
          "</span>";
      } else if (status.locked === false) {
        lockIconHtml =
          '<span class="lock-icon lock-icon--unlocked" title="Server terbuka (tanpa password)">' +
          LOCK_ICON_UNLOCKED_SVG +
          "</span>";
      }

      const actionCellHtml = isFavoriteTab
        ? '<button class="remove-server-btn" type="button" title="Hapus Server">&times;</button>'
        : "";

      tr.innerHTML =
        "<td>" + escapeHtml(status.name) + offlineBadge + "</td>" +
        "<td>" + escapeHtml(status.version) + "</td>" +
        "<td>" + escapeHtml(status.gamemode) + "</td>" +
        "<td class=\"servers-table__players\">" + escapeHtml(playersText) + "</td>" +
        "<td class=\"servers-table__ping\">" + escapeHtml(pingText) + "</td>" +
        "<td class=\"servers-table__lock\">" + lockIconHtml + "</td>" +
        "<td>" + actionCellHtml + "</td>";

      tr.addEventListener("click", (event) => {
        if (event.target.closest(".remove-server-btn")) {
          return;
        }

        const rowKey = serverKey(srv.host, srv.port);

        if (rowClickTimer !== null && lastClickedRowKey === rowKey) {
          clearTimeout(rowClickTimer);
          rowClickTimer = null;
          lastClickedRowKey = null;
          openConnectModalFor(srv.host, srv.port, statusCache[rowKey] || status);
          return;
        }

        if (rowClickTimer !== null) {
          clearTimeout(rowClickTimer);
          rowClickTimer = null;
        }

        lastClickedRowKey = rowKey;
        rowClickTimer = setTimeout(() => {
          rowClickTimer = null;
          lastClickedRowKey = null;
          openServerSidebar(srv.host, srv.port);
        }, 220);
      });

      const removeBtn = tr.querySelector(".remove-server-btn");
      if (removeBtn) {
        removeBtn.addEventListener("click", async (event) => {
          event.stopPropagation();
          try {
            await window.sampLauncher.removeServer(srv.host, srv.port);
            showToast("Server dihapus dari daftar", "success");
            if (sidebarSelected && sidebarSelected.host === srv.host && sidebarSelected.port === srv.port) {
              closeServerSidebar();
            }
            await loadServers();
          } catch (err) {
            showToast("Gagal menghapus server: " + err.message, "error");
          }
        });
      }

      serversTableBody.appendChild(tr);
    });

    updateSidebarRemoveButtonVisibility();
  }

  function updateSelectedRowHighlight() {
    const rows = serversTableBody.querySelectorAll(".server-row");
    rows.forEach((row) => {
      const isSelectedRow =
        sidebarSelected &&
        row.dataset.host === sidebarSelected.host &&
        row.dataset.port === String(sidebarSelected.port);
      row.classList.toggle("server-row--selected", !!isSelectedRow);
    });
  }

  function resolveOnlineText(status) {
    if (!status) return "-";
    return status.online ? "Online" : "Offline";
  }

  function normalizeExternalUrl(rawUrl) {
    if (!rawUrl) return "";
    const trimmed = String(rawUrl).trim();
    if (!trimmed || trimmed.toLowerCase() === "none" || trimmed.toLowerCase() === "-") {
      return "";
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return "http://" + trimmed;
  }

  function renderSidebarCustomRules(status) {
    const customRules = status && status.customRules && typeof status.customRules === "object" ? status.customRules : {};

    sidebarInfoGrid.querySelectorAll(".sidebar-info-row--custom-rule").forEach((row) => row.remove());

    for (const key of Object.keys(customRules)) {
      const row = document.createElement("div");
      row.className = "sidebar-info-row sidebar-info-row--custom-rule";

      const label = document.createElement("span");
      label.className = "info-label";
      label.textContent = key;

      const value = document.createElement("span");
      value.className = "info-value";
      value.textContent = customRules[key];

      row.appendChild(label);
      row.appendChild(value);
      sidebarInfoGrid.appendChild(row);
    }
  }

  function renderSidebarStaticInfo(host, port, status) {
    sidebarServerName.textContent = status && status.name ? status.name : host + ":" + port;
    sidebarServerIp.textContent = host + ":" + port;

    sidebarGamemode.textContent = status && status.gamemode ? status.gamemode : "-";
    sidebarMapEl.textContent = status && status.mapname ? status.mapname : "-";
    sidebarLanguageEl.textContent = status && status.language ? status.language : "-";
    sidebarVersion.textContent = status && status.version ? status.version : "-";
    sidebarMax.textContent = status ? String(status.maxCount) : "-";
    sidebarWeatherEl.textContent = status && status.weather ? status.weather : "-";
    sidebarWorldtimeEl.textContent = status && status.worldtime ? status.worldtime : "-";
    sidebarLagcompEl.textContent = status && status.lagcomp ? status.lagcomp : "-";

    if (!status) {
      sidebarLocked.textContent = "-";
    } else if (status.locked === true) {
      sidebarLocked.textContent = "Terkunci";
    } else if (status.locked === false) {
      sidebarLocked.textContent = "Terbuka";
    } else {
      sidebarLocked.textContent = "Tidak diketahui";
    }

    sidebarCurrentWebsiteUrl = normalizeExternalUrl(status && status.weburl);
    sidebarWebsiteBtn.classList.toggle("visible", !!sidebarCurrentWebsiteUrl);

    sidebarStatPlayers.textContent = status ? status.onlineCount + " / " + status.maxCount : "-";
    sidebarStatPing.textContent = status && status.ping !== null && status.ping !== undefined ? status.ping + " ms" : "-";
    sidebarStatStatus.textContent = resolveOnlineText(status);

    renderSidebarCustomRules(status);
  }

  sidebarWebsiteBtn.addEventListener("click", async () => {
    if (!sidebarCurrentWebsiteUrl) return;
    sidebarWebsiteBtn.disabled = true;
    try {
      const result = await window.sampLauncher.openExternalUrl(sidebarCurrentWebsiteUrl);
      if (!result || !result.success) {
        showToast(result && result.message ? result.message : "Gagal membuka website server", "error");
      }
    } catch (err) {
      showToast("Gagal membuka website server: " + err.message, "error");
    } finally {
      sidebarWebsiteBtn.disabled = false;
    }
  });

  function renderSidebarPlayers(playersResult) {
    if (!playersResult || !playersResult.connected) {
      sidebarPlayerList.innerHTML = '<div class="sidebar-player-empty">Server sedang offline atau tidak merespon.</div>';
      sidebarPlayerCount.textContent = "";
      return;
    }

    const players = playersResult.players || [];
    sidebarPlayerCount.textContent = players.length > 0 ? "(" + players.length + ")" : "";

    if (players.length === 0) {
      sidebarPlayerList.innerHTML = '<div class="sidebar-player-empty">Belum ada player online di server ini.</div>';
      return;
    }

    const rowsHtml = players
      .map((player, index) => {
        const metaParts = [];
        if (typeof player.score === "number") {
          metaParts.push("Score " + player.score);
        }
        if (typeof player.ping === "number") {
          metaParts.push(player.ping + " ms");
        }
        const metaHtml =
          metaParts.length > 0
            ? '<span class="sidebar-player-meta">' + escapeHtml(metaParts.join(" · ")) + "</span>"
            : "";
        return (
          '<div class="sidebar-player-row">' +
          '<span class="sidebar-player-index">' + (index + 1) + ".</span>" +
          '<span class="sidebar-player-name">' + escapeHtml(player.name) + "</span>" +
          metaHtml +
          "</div>"
        );
      })
      .join("");

    sidebarPlayerList.innerHTML = rowsHtml;
  }

  function resizeSidebarCanvasIfNeeded() {
    if (!sidebarPingChart) return;
    const displayWidth = sidebarPingChart.clientWidth || 280;
    const displayHeight = sidebarPingChart.clientHeight || 80;
    if (sidebarPingChart.width !== displayWidth) sidebarPingChart.width = displayWidth;
    if (sidebarPingChart.height !== displayHeight) sidebarPingChart.height = displayHeight;
  }

  function drawSidebarPingChart() {
    if (!sidebarPingChart) return;
    const ctx = sidebarPingChart.getContext("2d");
    const w = sidebarPingChart.width;
    const h = sidebarPingChart.height;

    ctx.clearRect(0, 0, w, h);

    const values = pingHistory.filter((v) => typeof v === "number");
    if (values.length === 0) {
      return;
    }

    const paddingTop = 8;
    const paddingBottom = 6;
    const usableHeight = h - paddingTop - paddingBottom;
    const maxValue = Math.max.apply(null, values.concat([50]));
    const stepX = values.length > 1 ? w / (values.length - 1) : 0;

    function pointAt(index, value) {
      const x = values.length > 1 ? index * stepX : w / 2;
      const y = paddingTop + usableHeight - (value / maxValue) * usableHeight;
      return { x, y };
    }

    ctx.beginPath();
    values.forEach((value, index) => {
      const p = pointAt(index, value);
      if (index === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    });
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 122, 24, 0.14)";
    ctx.fill();

    ctx.beginPath();
    values.forEach((value, index) => {
      const p = pointAt(index, value);
      if (index === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    });
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ff7a18";
    ctx.lineJoin = "round";
    ctx.stroke();

    const lastPoint = pointAt(values.length - 1, values[values.length - 1]);
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ff7a18";
    ctx.fill();
  }

  function pushPingToHistory(ping) {
    if (typeof ping === "number") {
      pingHistory.push(ping);
    } else {
      pingHistory.push(null);
    }
    if (pingHistory.length > PING_HISTORY_MAX) {
      pingHistory.shift();
    }
    drawSidebarPingChart();
  }

  async function refreshSidebarData() {
    if (!sidebarSelected) return;
    const { host, port } = sidebarSelected;

    try {
      const status = await window.sampLauncher.getServerStatus(host, port);
      const key = serverKey(host, port);

      if (status && status.connected) {
        statusCache[key] = buildOnlineStatus(key, status);
      } else {
        statusCache[key] = buildOfflineStatus(key, statusCache[key]);
      }

      if (!sidebarSelected || sidebarSelected.host !== host || sidebarSelected.port !== port) {
        return;
      }

      const cachedStatus = statusCache[key];
      renderSidebarStaticInfo(host, port, cachedStatus);
      pushPingToHistory(cachedStatus.online ? cachedStatus.ping : null);

      const playersResult = await window.sampLauncher.getServerPlayers(host, port);
      if (!sidebarSelected || sidebarSelected.host !== host || sidebarSelected.port !== port) {
        return;
      }
      renderSidebarPlayers(playersResult);
    } catch (err) {
    }
  }

  function stopSidebarRefresh() {
    if (sidebarRefreshTimer) {
      clearInterval(sidebarRefreshTimer);
      sidebarRefreshTimer = null;
    }
  }

  function startSidebarRefresh() {
    stopSidebarRefresh();
    sidebarRefreshTimer = setInterval(refreshSidebarData, SIDEBAR_REFRESH_INTERVAL_MS);
  }

  function openServerSidebar(host, port) {
    sidebarSelected = { host, port };
    pingHistory = [];

    const key = serverKey(host, port);
    const status = statusCache[key] || buildOfflineStatus(key, null);

    renderSidebarStaticInfo(host, port, status);
    sidebarPlayerList.innerHTML = '<div class="sidebar-player-empty">Memuat daftar player...</div>';
    sidebarPlayerCount.textContent = "";

    serverSidebar.classList.add("active");
    updateSelectedRowHighlight();
    updateSidebarRemoveButtonVisibility();

    setTimeout(() => {
      resizeSidebarCanvasIfNeeded();
      drawSidebarPingChart();
    }, 60);

    refreshSidebarData();
    startSidebarRefresh();
  }

  function closeServerSidebar() {
    sidebarSelected = null;
    pingHistory = [];
    stopSidebarRefresh();
    serverSidebar.classList.remove("active");
    updateSelectedRowHighlight();
  }

  function updateSidebarRemoveButtonVisibility() {
    if (!sidebarSelected) {
      sidebarRemoveBtn.style.display = "none";
      return;
    }
    const isFavorite = savedServers.some(
      (item) => item.host === sidebarSelected.host && item.port === sidebarSelected.port
    );
    sidebarRemoveBtn.style.display = isFavorite ? "flex" : "none";
  }

  sidebarCloseBtn.addEventListener("click", closeServerSidebar);

  sidebarConnectBtn.addEventListener("click", () => {
    if (!sidebarSelected) return;
    const key = serverKey(sidebarSelected.host, sidebarSelected.port);
    openConnectModalFor(sidebarSelected.host, sidebarSelected.port, statusCache[key]);
  });

  sidebarRemoveBtn.addEventListener("click", async () => {
    if (!sidebarSelected) return;
    const { host, port } = sidebarSelected;

    sidebarRemoveBtn.disabled = true;
    try {
      await window.sampLauncher.removeServer(host, port);
      showToast("Server dihapus dari daftar", "success");
      closeServerSidebar();
      await loadServers();
    } catch (err) {
      showToast("Gagal menghapus server: " + err.message, "error");
    } finally {
      sidebarRemoveBtn.disabled = false;
    }
  });

  function showAddServerError(message) {
    addServerErrorMessage.textContent = message;
    addServerErrorMessage.classList.add("show");
  }

  function clearAddServerError() {
    addServerErrorMessage.textContent = "";
    addServerErrorMessage.classList.remove("show");
  }

  function openAddServerModal() {
    addServerIpInput.value = "";
    clearAddServerError();
    addServerModalOverlay.classList.add("active");
    setTimeout(() => addServerIpInput.focus(), 150);
  }

  function closeAddServerModal() {
    addServerModalOverlay.classList.remove("active");
    clearAddServerError();
  }

  async function handleAddServer() {
    const rawInput = addServerIpInput.value.trim();

    if (!rawInput) {
      showAddServerError("IP/Host server tidak boleh kosong");
      return;
    }

    let host = rawInput;
    let port = 7777;

    const lastColonIndex = rawInput.lastIndexOf(":");
    if (lastColonIndex !== -1) {
      host = rawInput.substring(0, lastColonIndex).trim();
      const portRaw = rawInput.substring(lastColonIndex + 1).trim();
      port = Number(portRaw);
      if (!/^\d+$/.test(portRaw) || port <= 0 || port > 65535) {
        showAddServerError("Port tidak valid (1-65535)");
        return;
      }
    }

    if (!host) {
      showAddServerError("IP/Host server tidak boleh kosong");
      return;
    }

    clearAddServerError();
    addServerConfirmBtn.disabled = true;
    addServerConfirmBtn.textContent = "Mengecek...";

    try {
      const result = await window.sampLauncher.addServer(host, port);

      if (result && result.success) {
        showToast("Server berhasil ditambahkan", "success");
        closeAddServerModal();
        await loadServers();
      } else {
        showAddServerError(result && result.message ? result.message : "Gagal menambahkan server");
      }
    } catch (err) {
      showAddServerError("Terjadi kesalahan: " + err.message);
    } finally {
      addServerConfirmBtn.disabled = false;
      addServerConfirmBtn.textContent = "Add";
    }
  }

  function openConnectModalFor(host, port, status) {
    selectedServer = { host: host, port: port, status: status };
    modalServerIpEl.textContent = host + ":" + port;
    openModal();
  }

  async function openModal() {
    clearError();
    modalOverlay.classList.add("active");

    usernameInput.value = "";
    try {
      const settings = await window.sampLauncher.getSettings();
      const srvKey = selectedServer ? (selectedServer.host + ":" + selectedServer.port) : "";
      const serverUsernames = settings && settings.serverUsernames ? settings.serverUsernames : {};
      const savedName = (srvKey && serverUsernames[srvKey]) ? serverUsernames[srvKey] : (settings && settings.lastUsername ? settings.lastUsername : "");
      if (savedName) {
        usernameInput.value = savedName;
      }
      if (settings && settings.lastSampVersion) {
        sampVersionSelect.value = settings.lastSampVersion;
      }
    } catch (err) {
    }

    setTimeout(() => {
      usernameInput.focus();
      usernameInput.select();
    }, 150);
  }

  function closeModal() {
    modalOverlay.classList.remove("active");
    clearError();
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add("show");
    usernameInput.classList.add("input-error");
  }

  function clearError() {
    errorMessage.textContent = "";
    errorMessage.classList.remove("show");
    usernameInput.classList.remove("input-error");
  }

  function showSettingsError(message) {
    settingsErrorMessage.textContent = message;
    settingsErrorMessage.classList.add("show");
  }

  function clearSettingsError() {
    settingsErrorMessage.textContent = "";
    settingsErrorMessage.classList.remove("show");
  }

  const REPAIR_ICON_OK =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const REPAIR_ICON_MISSING =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const REPAIR_ICON_LOADING =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  let repairFileStates = {};

  function renderRepairFileList(items) {
    if (!repairFileList) return;
    repairFileList.innerHTML = "";
    items.forEach(function (item) {
      const state = repairFileStates[item.id] || {};
      const isMissing = item.missing;
      const stage = state.stage;

      let iconHtml = isMissing ? REPAIR_ICON_MISSING : REPAIR_ICON_OK;
      let iconClass = isMissing ? "repair-file-row__icon--missing" : "repair-file-row__icon--ok";
      let statusText = isMissing ? "Tidak ditemukan" : "OK";
      let statusClass = isMissing ? "repair-file-row__status--missing" : "repair-file-row__status--ok";
      let progressHtml = "";

      if (stage === "downloading") {
        iconHtml = REPAIR_ICON_LOADING;
        iconClass = "repair-file-row__icon--loading";
        statusText = (state.percent || 0) + "%";
        statusClass = "";
        progressHtml =
          '<div class="repair-file-progress"><div class="repair-file-progress__fill" style="width:' +
          (state.percent || 0) + '%"></div></div>';
      } else if (stage === "done") {
        iconHtml = REPAIR_ICON_OK;
        iconClass = "repair-file-row__icon--ok";
        statusText = "Dipulihkan";
        statusClass = "repair-file-row__status--done";
      } else if (stage === "error") {
        iconHtml = REPAIR_ICON_MISSING;
        iconClass = "repair-file-row__icon--missing";
        statusText = "Gagal";
        statusClass = "repair-file-row__status--error";
      }

      const row = document.createElement("div");
      row.className = "repair-file-row";
      row.dataset.fileId = item.id;
      row.innerHTML =
        '<span class="repair-file-row__icon ' + iconClass + '">' + iconHtml + '</span>' +
        '<span class="repair-file-row__name">' + escapeHtml(item.label) + '</span>' +
        progressHtml +
        '<span class="repair-file-row__status ' + statusClass + '">' + statusText + '</span>';
      repairFileList.appendChild(row);
    });
  }

  async function checkRepairStatus(silent) {
    if (!window.sampLauncher || !window.sampLauncher.checkRepair) return;
    try {
      const items = await window.sampLauncher.checkRepair();
      repairFileStates = {};
      renderRepairFileList(items);
      const hasMissing = items.some(function (i) { return i.missing; });
      if (repairBtn) {
        repairBtn.classList.toggle("btn-repair--warning", hasMissing);
        repairBtn.textContent = "Cek & Repair";
        repairBtn.disabled = false;
      }
    } catch (err) {
      if (!silent) showToast("Gagal memeriksa komponen: " + err.message, "error");
    }
  }

  async function handleRepair() {
    if (!window.sampLauncher || !window.sampLauncher.repairLauncher) return;
    if (repairBtn) {
      repairBtn.disabled = true;
      repairBtn.textContent = "Memperbaiki...";
    }
    try {
      const result = await window.sampLauncher.repairLauncher();
      if (result && result.success) {
        if (result.nothingMissing) {
          showToast("Semua komponen launcher sudah lengkap.", "success");
        } else {
          showToast(result.message || "Repair selesai.", "success");
        }
      } else {
        showToast((result && result.message) || "Repair gagal.", "error");
      }
    } catch (err) {
      showToast("Terjadi kesalahan saat repair: " + err.message, "error");
    } finally {
      await checkRepairStatus(true);
    }
  }

  if (repairBtn) {
    repairBtn.addEventListener("click", handleRepair);
  }

  if (window.sampLauncher && typeof window.sampLauncher.onRepairProgress === "function") {
    window.sampLauncher.onRepairProgress(function (data) {
      if (!data) return;

      if (repairModalProgressFill && typeof data.percent === "number") {
        repairModalProgressFill.style.width = data.percent + "%";
      }
      if (repairModalPercentText && typeof data.percent === "number") {
        repairModalPercentText.textContent = data.percent + "%";
      }
      if (repairModalStatusText && data.label) {
        repairModalStatusText.textContent = "Mengunduh " + data.label + "...";
      }

      if (!data.fileId) return;
      repairFileStates[data.fileId] = data;
      const row = repairFileList && repairFileList.querySelector('[data-file-id="' + data.fileId + '"]');
      if (!row) return;

      const iconEl = row.querySelector(".repair-file-row__icon");
      const statusEl = row.querySelector(".repair-file-row__status");
      let progressEl = row.querySelector(".repair-file-progress");
      const fillEl = progressEl && progressEl.querySelector(".repair-file-progress__fill");

      if (data.stage === "downloading") {
        if (iconEl) { iconEl.className = "repair-file-row__icon repair-file-row__icon--loading"; iconEl.innerHTML = REPAIR_ICON_LOADING; }
        if (statusEl) { statusEl.className = "repair-file-row__status"; statusEl.textContent = (data.percent || 0) + "%"; }
        if (!progressEl) {
          progressEl = document.createElement("div");
          progressEl.className = "repair-file-progress";
          progressEl.innerHTML = '<div class="repair-file-progress__fill"></div>';
          row.insertBefore(progressEl, statusEl);
        }
        const pFill = progressEl.querySelector(".repair-file-progress__fill");
        if (pFill) pFill.style.width = (data.percent || 0) + "%";
      } else if (data.stage === "done") {
        if (iconEl) { iconEl.className = "repair-file-row__icon repair-file-row__icon--ok"; iconEl.innerHTML = REPAIR_ICON_OK; }
        if (statusEl) { statusEl.className = "repair-file-row__status repair-file-row__status--done"; statusEl.textContent = "Dipulihkan"; }
        if (fillEl) fillEl.style.width = "100%";
        setTimeout(function () { if (progressEl && progressEl.parentNode) progressEl.remove(); }, 800);
      } else if (data.stage === "error") {
        if (iconEl) { iconEl.className = "repair-file-row__icon repair-file-row__icon--missing"; iconEl.innerHTML = REPAIR_ICON_MISSING; }
        if (statusEl) { statusEl.className = "repair-file-row__status repair-file-row__status--error"; statusEl.textContent = "Gagal"; }
        if (progressEl && progressEl.parentNode) progressEl.remove();
      }
    });
  }

  let pendingRepairCallback = null;

  function renderRepairModalFileList(items) {
    if (!repairModalFileList) return;
    repairModalFileList.innerHTML = "";
    (items || []).forEach(function (item) {
      const row = document.createElement("div");
      row.className = "repair-file-row";
      row.innerHTML =
        '<span class="repair-file-row__icon repair-file-row__icon--missing">' + REPAIR_ICON_MISSING + '</span>' +
        '<span class="repair-file-row__name">' + escapeHtml(item.label) + '</span>' +
        '<span class="repair-file-row__status repair-file-row__status--missing">Tidak ditemukan</span>';
      repairModalFileList.appendChild(row);
    });
  }

  function openRepairModal(missingItems, onRepairedCallback) {
    pendingRepairCallback = typeof onRepairedCallback === "function" ? onRepairedCallback : null;
    renderRepairModalFileList(missingItems);

    if (repairModalProgressWrap) repairModalProgressWrap.style.display = "none";
    if (repairModalProgressFill) repairModalProgressFill.style.width = "0%";
    if (repairModalStatusText) repairModalStatusText.textContent = "Mengunduh...";
    if (repairModalPercentText) repairModalPercentText.textContent = "0%";

    if (repairModalCancelBtn) repairModalCancelBtn.disabled = false;
    if (repairModalConfirmBtn) {
      repairModalConfirmBtn.disabled = false;
      repairModalConfirmBtn.textContent = "Install & Repair";
    }

    if (repairModalOverlay) repairModalOverlay.classList.add("active");
  }

  function closeRepairModal() {
    if (repairModalOverlay) repairModalOverlay.classList.remove("active");
    pendingRepairCallback = null;
  }

  async function handleConfirmRepairModal() {
    if (!window.sampLauncher || !window.sampLauncher.repairLauncher) return;

    if (repairModalCancelBtn) repairModalCancelBtn.disabled = true;
    if (repairModalConfirmBtn) {
      repairModalConfirmBtn.disabled = true;
      repairModalConfirmBtn.textContent = "Mengunduh...";
    }
    if (repairModalProgressWrap) repairModalProgressWrap.style.display = "flex";
    if (repairModalProgressFill) repairModalProgressFill.style.width = "0%";

    try {
      const result = await window.sampLauncher.repairLauncher();
      if (result && result.success) {
        showToast("Komponen launcher berhasil diinstall & diperbaiki!", "success");
        const cb = pendingRepairCallback;
        closeRepairModal();
        if (cb) {
          cb();
        }
      } else {
        showToast((result && result.message) || "Repair gagal.", "error");
        if (repairModalCancelBtn) repairModalCancelBtn.disabled = false;
        if (repairModalConfirmBtn) {
          repairModalConfirmBtn.disabled = false;
          repairModalConfirmBtn.textContent = "Coba Lagi";
        }
      }
    } catch (err) {
      showToast("Terjadi kesalahan saat repair: " + err.message, "error");
      if (repairModalCancelBtn) repairModalCancelBtn.disabled = false;
      if (repairModalConfirmBtn) {
        repairModalConfirmBtn.disabled = false;
        repairModalConfirmBtn.textContent = "Coba Lagi";
      }
    } finally {
      checkRepairStatus(true);
    }
  }

  if (repairModalCancelBtn) {
    repairModalCancelBtn.addEventListener("click", closeRepairModal);
  }

  if (repairModalConfirmBtn) {
    repairModalConfirmBtn.addEventListener("click", handleConfirmRepairModal);
  }

  async function openSettingsModal() {
    clearSettingsError();
    settingsModalOverlay.classList.add("active");
    checkRepairStatus(true);

    try {
      const settings = await window.sampLauncher.getSettings();
      directoryInput.value = settings && settings.gtaSaDirectory ? settings.gtaSaDirectory : "";
    } catch (err) {
      showSettingsError("Gagal memuat pengaturan: " + err.message);
    }
  }

  function closeSettingsModal() {
    settingsModalOverlay.classList.remove("active");
    clearSettingsError();
  }

  async function handleBrowseDirectory() {
    try {
      const result = await window.sampLauncher.selectDirectory();
      if (!result.canceled && result.directory) {
        directoryInput.value = result.directory;
        clearSettingsError();
      }
    } catch (err) {
      showSettingsError("Gagal membuka dialog folder: " + err.message);
    }
  }

  async function handleSaveSettings() {
    const gtaSaDirectory = directoryInput.value.trim();

    if (!gtaSaDirectory) {
      showSettingsError("Directory GTA SA belum dipilih");
      return;
    }

    clearSettingsError();
    settingsSaveBtn.disabled = true;
    settingsSaveBtn.textContent = "Menyimpan...";

    try {
      const result = await window.sampLauncher.saveSettings(gtaSaDirectory);

      if (result && result.success) {
        showToast(result.message || "Directory GTA SA berhasil disimpan", "success");
        closeSettingsModal();
      } else {
        showSettingsError(result && result.message ? result.message : "Gagal menyimpan pengaturan");
      }
    } catch (err) {
      showSettingsError("Terjadi kesalahan: " + err.message);
    } finally {
      settingsSaveBtn.disabled = false;
      settingsSaveBtn.textContent = "Save";
    }
  }

  const MOON_ICON_PATH =
    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';
  const SUN_ICON_PATH =
    '<circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.6"/>' +
    '<path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.55 1.55M18.25 18.25l1.55 1.55M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.55-1.55M18.25 5.75l1.55-1.55" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';

  const LOCK_ICON_LOCKED_SVG =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.8"/>' +
    '<path d="M8 11V7.5a4 4 0 0 1 8 0V11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
    '<circle cx="12" cy="15.3" r="1.4" fill="currentColor"/>' +
    "</svg>";

  const LOCK_ICON_UNLOCKED_SVG =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.8"/>' +
    '<path d="M8 11V7.5a4 4 0 0 1 7.6-1.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
    '<circle cx="12" cy="15.3" r="1.4" fill="currentColor"/>' +
    "</svg>";

  const LOCK_ICON_UNKNOWN_SVG =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.8"/>' +
    '<path d="M8 11V7.5a4 4 0 0 1 8 0V11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="1.5 2.5"/>' +
    '<circle cx="12" cy="15.3" r="1.2" fill="currentColor"/>' +
    "</svg>";

  function applyTheme(theme) {
    if (theme === "light") {
      document.body.classList.add("theme-light");
      themeToggleIcon.innerHTML = SUN_ICON_PATH;
      themeToggleBtn.title = "Ganti ke Mode Gelap";
    } else {
      document.body.classList.remove("theme-light");
      themeToggleIcon.innerHTML = MOON_ICON_PATH;
      themeToggleBtn.title = "Ganti ke Mode Terang";
    }
  }

  async function toggleTheme() {
    const nextTheme = document.body.classList.contains("theme-light") ? "dark" : "light";
    applyTheme(nextTheme);
    try {
      await window.sampLauncher.saveTheme(nextTheme);
    } catch (err) {
    }
  }

  async function initTheme() {
    try {
      const settings = await window.sampLauncher.getSettings();
      applyTheme(settings && settings.theme === "light" ? "light" : "dark");
    } catch (err) {
      applyTheme("dark");
    }
  }

  function showToast(message, type) {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    toast.textContent = message;
    toast.className = "toast show " + (type || "");
    toastTimeout = setTimeout(() => {
      toast.classList.remove("show");
    }, 3200);
  }

  async function performLaunch(playerName, serverPassword, sampVersion, triggerBtn, triggerDefaultText, onFinishClose) {
    const status = selectedServer.status || {};

    triggerBtn.disabled = true;
    triggerBtn.textContent = "Menghubungkan...";

    try {
      const result = await window.sampLauncher.launchSamp(
        selectedServer.host,
        selectedServer.port,
        playerName,
        {
          serverName: status.name,
          onlinePlayers: status.onlineCount,
          maxPlayers: status.maxCount
        },
        serverPassword,
        sampVersion
      );

      if (result && result.success) {
        showToast(result.message || "SA-MP sedang dijalankan...", "success");
        onFinishClose();
        return true;
      }

      if (result && result.needsRepair) {
        onFinishClose();
        openRepairModal(result.missingComponents, function () {
          performLaunch(playerName, serverPassword, sampVersion, triggerBtn, triggerDefaultText, onFinishClose);
        });
        return false;
      }

      return { message: result && result.message ? result.message : "Gagal menjalankan SA-MP" };
    } catch (err) {
      return { message: "Terjadi kesalahan: " + err.message };
    } finally {
      triggerBtn.disabled = false;
      triggerBtn.textContent = triggerDefaultText;
    }
  }

  async function handleConnect() {
    if (!selectedServer) {
      showError("Pilih server dari daftar terlebih dahulu");
      return;
    }

    const playerName = usernameInput.value.trim();

    if (!playerName) {
      showError("Username tidak boleh kosong");
      return;
    }

    if (!NICKNAME_PATTERN.test(playerName)) {
      showError("Username hanya boleh huruf, angka, underscore, dan [ ], 3-20 karakter");
      return;
    }

    clearError();

    const status = selectedServer.status || {};
    const sampVersion = sampVersionSelect.value;

    if (status.locked === true) {
      pendingPlayerName = playerName;
      pendingSampVersion = sampVersion;
      closeModal();
      openPasswordModalFor(selectedServer.host, selectedServer.port);
      return;
    }

    const outcome = await performLaunch(playerName, "", sampVersion, connectBtn, "Connect", closeModal);
    if (outcome !== true && outcome) {
      showError(outcome.message);
    }
  }

  async function handlePasswordConnect() {
    if (!selectedServer) {
      showPasswordError("Pilih server dari daftar terlebih dahulu");
      return;
    }

    const serverPassword = serverPasswordInput.value;

    if (!serverPassword) {
      showPasswordError("Password server tidak boleh kosong");
      return;
    }

    clearPasswordError();

    const outcome = await performLaunch(pendingPlayerName, serverPassword, pendingSampVersion, passwordConnectBtn, "Connect", closePasswordModal);
    if (outcome !== true && outcome) {
      showPasswordError(outcome.message);
    }
  }

  function openPasswordModalFor(host, port) {
    passwordModalServerIpEl.textContent = host + ":" + port;
    serverPasswordInput.value = "";
    clearPasswordError();
    passwordModalOverlay.classList.add("active");
    setTimeout(() => serverPasswordInput.focus(), 150);
  }

  function closePasswordModal() {
    passwordModalOverlay.classList.remove("active");
    clearPasswordError();
    pendingPlayerName = "";
  }

  function showPasswordError(message) {
    passwordErrorMessage.textContent = message;
    passwordErrorMessage.classList.add("show");
    serverPasswordInput.classList.add("input-error");
  }

  function clearPasswordError() {
    passwordErrorMessage.textContent = "";
    passwordErrorMessage.classList.remove("show");
    serverPasswordInput.classList.remove("input-error");
  }

  cancelBtn.addEventListener("click", closeModal);
  connectBtn.addEventListener("click", handleConnect);

  passwordCancelBtn.addEventListener("click", closePasswordModal);
  passwordConnectBtn.addEventListener("click", handlePasswordConnect);

  serverPasswordInput.addEventListener("input", () => {
    if (serverPasswordInput.value) {
      clearPasswordError();
    }
  });

  serverPasswordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handlePasswordConnect();
    }
  });

  passwordModalOverlay.addEventListener("click", (event) => {
    if (event.target === passwordModalOverlay) {
      closePasswordModal();
    }
  });

  settingsBtn.addEventListener("click", openSettingsModal);
  settingsCancelBtn.addEventListener("click", closeSettingsModal);
  browseBtn.addEventListener("click", handleBrowseDirectory);
  settingsSaveBtn.addEventListener("click", handleSaveSettings);

  addServerBtn.addEventListener("click", openAddServerModal);
  addServerCancelBtn.addEventListener("click", closeAddServerModal);
  addServerConfirmBtn.addEventListener("click", handleAddServer);

  addServerIpInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddServer();
    }
  });



  addServerModalOverlay.addEventListener("click", (event) => {
    if (event.target === addServerModalOverlay) {
      closeAddServerModal();
    }
  });

  function openUpdateModal(data) {
    pendingUpdateReleaseUrl = data && data.releaseUrl ? data.releaseUrl : "";
    updateModalLatestVersion.textContent = data && data.latestVersion ? data.latestVersion : "-";
    updateModalCurrentVersion.textContent = data && data.currentVersion ? data.currentVersion : "-";
    updateModalNotes.textContent = data && data.releaseNotes ? data.releaseNotes : "";
    updateModalOverlay.classList.add("active");
  }

  function closeUpdateModal() {
    updateModalOverlay.classList.remove("active");
  }

  updateModalLaterBtn.addEventListener("click", closeUpdateModal);

  updateModalDownloadBtn.addEventListener("click", async () => {
    if (!pendingUpdateReleaseUrl) {
      closeUpdateModal();
      return;
    }
    updateModalDownloadBtn.disabled = true;
    try {
      const result = await window.sampLauncher.openExternalUrl(pendingUpdateReleaseUrl);
      if (!result || !result.success) {
        showToast(result && result.message ? result.message : "Gagal membuka link download", "error");
      }
    } catch (err) {
      showToast("Gagal membuka link download: " + err.message, "error");
    } finally {
      updateModalDownloadBtn.disabled = false;
      closeUpdateModal();
    }
  });

  updateModalOverlay.addEventListener("click", (event) => {
    if (event.target === updateModalOverlay) {
      closeUpdateModal();
    }
  });

  if (window.sampLauncher.onUpdateAvailable) {
    window.sampLauncher.onUpdateAvailable(openUpdateModal);
  }

  discordServerBtn.addEventListener("click", async () => {
    try {
      const result = await window.sampLauncher.openDiscordServer();
      if (!result || !result.success) {
        showToast(result && result.message ? result.message : "Gagal membuka Discord", "error");
      }
    } catch (err) {
      showToast("Gagal membuka Discord: " + err.message, "error");
    }
  });

  settingsModalOverlay.addEventListener("click", (event) => {
    if (event.target === settingsModalOverlay) {
      closeSettingsModal();
    }
  });

  usernameInput.addEventListener("input", () => {
    if (usernameInput.value.trim()) {
      clearError();
    }
  });

  usernameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleConnect();
    }
  });

  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (modalOverlay.classList.contains("active")) {
      closeModal();
    }
    if (passwordModalOverlay.classList.contains("active")) {
      closePasswordModal();
    }
    if (settingsModalOverlay.classList.contains("active")) {
      closeSettingsModal();
    }
    if (addServerModalOverlay.classList.contains("active")) {
      closeAddServerModal();
    }
    if (updateModalOverlay.classList.contains("active")) {
      closeUpdateModal();
    }
  });

  themeToggleBtn.addEventListener("click", toggleTheme);

  function updateSortArrows() {
    sortableHeaders.forEach((th) => {
      const key = th.getAttribute("data-sort-key");
      const arrow = th.querySelector(".sort-arrow");
      if (key === currentSortKey) {
        th.classList.add("sort-active");
        arrow.textContent = currentSortDirection === "asc" ? "▲" : "▼";
      } else {
        th.classList.remove("sort-active");
        arrow.textContent = "";
      }
    });
  }

  let isCleoDownloading = false;

  function setCleoProgress(percent, label) {
    const clampedPercent = Math.max(0, Math.min(100, typeof percent === "number" ? percent : 0));
    cleoProgressWrapper.classList.add("active");
    cleoProgressFill.style.width = clampedPercent + "%";
    cleoProgressLabel.textContent = label || clampedPercent + "%";
  }

  function hideCleoProgress() {
    cleoProgressWrapper.classList.remove("active");
    cleoProgressFill.style.width = "0%";
    cleoProgressLabel.textContent = "0%";
  }

  async function refreshCleoStatus() {
    if (isCleoDownloading) {
      return;
    }
    try {
      const result = await window.sampLauncher.checkCleoInstalled();

      if (!result || !result.gtaSaDirectory) {
        cleoDownloadBtn.disabled = true;
        cleoDownloadBtn.textContent = "Atur Directory GTA SA Dulu";
        cleoDownloadBtn.classList.remove("mod-card__btn--installed");
        return;
      }

      if (result.installed) {
        cleoDownloadBtn.disabled = true;
        cleoDownloadBtn.textContent = "✓ Terinstall";
        cleoDownloadBtn.classList.add("mod-card__btn--installed");
      } else {
        cleoDownloadBtn.disabled = false;
        cleoDownloadBtn.textContent = "Download";
        cleoDownloadBtn.classList.remove("mod-card__btn--installed");
      }
    } catch (err) {
      cleoDownloadBtn.disabled = false;
      cleoDownloadBtn.textContent = "Download";
      cleoDownloadBtn.classList.remove("mod-card__btn--installed");
    }
  }

  async function handleDownloadCleo() {
    if (isCleoDownloading) {
      return;
    }

    isCleoDownloading = true;
    cleoDownloadBtn.disabled = true;
    cleoDownloadBtn.textContent = "Menyiapkan...";
    setCleoProgress(0, "Memulai download...");

    try {
      const result = await window.sampLauncher.downloadCleo();

      if (result && result.success) {
        if (result.alreadyInstalled) {
          showToast("CLEO 4 sudah terinstall di directory GTA SA kamu", "success");
        } else {
          showToast("CLEO 4 berhasil didownload dan diinstall", "success");
        }
      } else {
        showToast((result && result.message) || "Gagal mendownload CLEO 4", "error");
      }
    } catch (err) {
      showToast("Terjadi kesalahan: " + err.message, "error");
    } finally {
      isCleoDownloading = false;
      hideCleoProgress();
      await refreshCleoStatus();
    }
  }

  if (window.sampLauncher && typeof window.sampLauncher.onCleoDownloadProgress === "function") {
    window.sampLauncher.onCleoDownloadProgress((data) => {
      if (!data) {
        return;
      }

      if (data.stage === "downloading") {
        const percent = typeof data.percent === "number" ? data.percent : 0;
        const label = data.totalBytes ? percent + "%" : "Mengunduh...";
        setCleoProgress(percent, label);
      } else if (data.stage === "extracting") {
        setCleoProgress(100, "Mengekstrak file...");
      } else if (data.stage === "done") {
        setCleoProgress(100, "Selesai!");
      } else if (data.stage === "error") {
        setCleoProgress(0, "Gagal");
      }
    });
  }

  if (cleoDownloadBtn) {
    cleoDownloadBtn.addEventListener("click", handleDownloadCleo);
  }

  function createModDownloader(modId, btn, progressWrapper, progressFill, progressLabel, labelName) {
    let isDownloading = false;

    function setProgress(percent, label) {
      const clampedPercent = Math.max(0, Math.min(100, typeof percent === "number" ? percent : 0));
      progressWrapper.classList.add("active");
      progressFill.style.width = clampedPercent + "%";
      progressLabel.textContent = label || clampedPercent + "%";
    }

    function hideProgress() {
      progressWrapper.classList.remove("active");
      progressFill.style.width = "0%";
      progressLabel.textContent = "0%";
    }

    async function refresh() {
      if (isDownloading) {
        return;
      }
      try {
        const result = await window.sampLauncher.checkModInstalled(modId);

        if (!result || !result.gtaSaDirectory) {
          btn.disabled = true;
          btn.textContent = "Atur Directory GTA SA Dulu";
          btn.classList.remove("mod-card__btn--installed");
          return;
        }

        if (result.installed) {
          btn.disabled = true;
          btn.textContent = "✓ Terinstall";
          btn.classList.add("mod-card__btn--installed");
        } else {
          btn.disabled = false;
          btn.textContent = "Download";
          btn.classList.remove("mod-card__btn--installed");
        }
      } catch (err) {
        btn.disabled = false;
        btn.textContent = "Download";
        btn.classList.remove("mod-card__btn--installed");
      }
    }

    async function handleDownload() {
      if (isDownloading) {
        return;
      }

      isDownloading = true;
      btn.disabled = true;
      btn.textContent = "Menyiapkan...";
      setProgress(0, "Memulai download...");

      try {
        const result = await window.sampLauncher.downloadMod(modId);

        if (result && result.success) {
          if (result.alreadyInstalled) {
            showToast(labelName + " sudah terinstall di directory GTA SA kamu", "success");
          } else {
            showToast(labelName + " berhasil didownload dan diinstall", "success");
          }
        } else {
          showToast((result && result.message) || "Gagal mendownload " + labelName, "error");
        }
      } catch (err) {
        showToast("Terjadi kesalahan: " + err.message, "error");
      } finally {
        isDownloading = false;
        hideProgress();
        await refresh();
      }
    }

    if (window.sampLauncher && typeof window.sampLauncher.onModDownloadProgress === "function") {
      window.sampLauncher.onModDownloadProgress((data) => {
        if (!data || data.modId !== modId) {
          return;
        }

        if (data.stage === "downloading") {
          const percent = typeof data.percent === "number" ? data.percent : 0;
          const label = data.totalBytes ? percent + "%" : "Mengunduh...";
          setProgress(percent, label);
        } else if (data.stage === "extracting") {
          setProgress(100, "Mengekstrak file...");
        } else if (data.stage === "done") {
          setProgress(100, "Selesai!");
        } else if (data.stage === "error") {
          setProgress(0, "Gagal");
        }
      });
    }

    if (btn) {
      btn.addEventListener("click", handleDownload);
    }

    return { refresh: refresh };
  }

  const codsmpDownloader = createModDownloader(
    "codsmp",
    codsmpDownloadBtn,
    codsmpProgressWrapper,
    codsmpProgressFill,
    codsmpProgressLabel,
    "COD SMP"
  );

  const modloaderDownloader = createModDownloader(
    "modloader",
    modloaderDownloadBtn,
    modloaderProgressWrapper,
    modloaderProgressFill,
    modloaderProgressLabel,
    "ModLoader"
  );

  sortableHeaders.forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-sort-key");

      if (currentSortKey === key) {
        currentSortDirection = currentSortDirection === "asc" ? "desc" : "asc";
      } else {
        currentSortKey = key;
        currentSortDirection = key === "players" || key === "ping" ? "desc" : "asc";
      }

      updateSortArrows();
      renderServersTable();
    });
  });

  function updateChatlogStatusInfo() {
    if (!chatlogTextarea || !chatlogStatusInfo) return;
    const len = chatlogTextarea.value.length;
    const lines = chatlogTextarea.value ? chatlogTextarea.value.split("\n").length : 0;
    chatlogStatusInfo.textContent = len.toLocaleString("id-ID") + " karakter · " + lines.toLocaleString("id-ID") + " baris";
  }

  async function loadChatlog(isManualRefresh) {
    if (!chatlogTextarea) return;
    chatlogTextarea.placeholder = "Memuat chatlog...";
    try {
      const result = await window.sampLauncher.getChatlog();
      if (result && result.filePath) {
        chatlogPathLabel.textContent = result.filePath;
      }
      if (result && result.success) {
        chatlogTextarea.value = result.content || "";
        updateChatlogStatusInfo();
        setTimeout(() => {
          chatlogTextarea.scrollTop = chatlogTextarea.scrollHeight;
        }, 50);
        if (isManualRefresh) {
          showToast("Chatlog berhasil diperbarui", "success");
        }
      } else {
        chatlogTextarea.value = result && result.content ? result.content : "";
        updateChatlogStatusInfo();
        if (result && result.message) {
          showToast(result.message, "error");
        }
      }
    } catch (err) {
      showToast("Gagal memuat chatlog: " + err.message, "error");
    }
  }

  async function handleSaveChatlog() {
    if (!chatlogTextarea) return;
    chatlogSaveBtn.disabled = true;
    chatlogSaveBtn.textContent = "Menyimpan...";
    try {
      const result = await window.sampLauncher.saveChatlog(chatlogTextarea.value);
      if (result && result.success) {
        showToast(result.message || "Chatlog berhasil disimpan", "success");
        if (result.filePath) {
          chatlogPathLabel.textContent = result.filePath;
        }
      } else {
        showToast(result && result.message ? result.message : "Gagal menyimpan chatlog", "error");
      }
    } catch (err) {
      showToast("Gagal menyimpan chatlog: " + err.message, "error");
    } finally {
      chatlogSaveBtn.disabled = false;
      chatlogSaveBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<polyline points="7 3 7 8 15 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg><span>Save</span>';
    }
  }

  async function handleCopyChatlog() {
    if (!chatlogTextarea) return;
    try {
      const textToCopy = chatlogTextarea.value;
      await navigator.clipboard.writeText(textToCopy);
      showToast("Isi chatlog berhasil disalin ke clipboard", "success");
    } catch (err) {
      chatlogTextarea.select();
      document.execCommand("copy");
      showToast("Isi chatlog berhasil disalin ke clipboard", "success");
    }
  }

  async function handleOpenChatlogFolder() {
    try {
      const result = await window.sampLauncher.openChatlogFolder();
      if (!result || !result.success) {
        showToast((result && result.message) || "Gagal membuka folder chatlog", "error");
      }
    } catch (err) {
      showToast("Gagal membuka folder chatlog: " + err.message, "error");
    }
  }

  if (chatlogRefreshBtn) chatlogRefreshBtn.addEventListener("click", () => loadChatlog(true));
  if (chatlogSaveBtn) chatlogSaveBtn.addEventListener("click", handleSaveChatlog);
  if (chatlogCopyBtn) chatlogCopyBtn.addEventListener("click", handleCopyChatlog);
  if (chatlogFolderBtn) chatlogFolderBtn.addEventListener("click", handleOpenChatlogFolder);
  if (chatlogTextarea) chatlogTextarea.addEventListener("input", updateChatlogStatusInfo);

  function applyTabVisibility() {
    const isModsTab = currentTab === "mods";
    const isChatlogTab = currentTab === "chatlog";
    const isServerTab = !isModsTab && !isChatlogTab;

    modsPanel.classList.toggle("active", isModsTab);
    if (chatlogPanel) {
      chatlogPanel.classList.toggle("active", isChatlogTab);
    }
    serversTableWrapper.style.display = isServerTab ? "" : "none";
    if (serversTabsHint) {
      serversTabsHint.style.display = isServerTab ? "" : "none";
    }

    if (isModsTab || isChatlogTab) {
      closeServerSidebar();
    }

    if (isModsTab) {
      refreshCleoStatus();
      codsmpDownloader.refresh();
      modloaderDownloader.refresh();
    } else if (isChatlogTab) {
      loadChatlog(false);
    }
  }

  serversTabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");
      if (tab === currentTab) {
        return;
      }
      currentTab = tab;
      serversTabButtons.forEach((otherBtn) => {
        otherBtn.classList.toggle("active", otherBtn === btn);
      });
      applyTabVisibility();
      if (currentTab !== "mods" && currentTab !== "chatlog") {
        renderServersTable();
      }
    });
  });

  initTheme();
  loadServers();
  setInterval(refreshAllServerStatuses, STATUS_REFRESH_INTERVAL_MS);
})();