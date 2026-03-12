const { ipcMain, nativeImage, BrowserWindow, screen, app, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { clipboard } = require("electron");
const configOptions = require("./configOptions");
const Store = require("electron-store");

global.share = { ipcMain };

// const { addToInstanceHistory } = require("./History");
const icons = require("./Icons");
const galleryStore = new Store({
  name: "gallery-data",
  defaults: {
    zones: [],
    clipboardHistory: [],
  },
});

let clipboardPollTimer = null;
let lastClipboardSignature = "";

const getVaultDir = () => {
  const vaultDir = path.join(app.getPath("userData"), "vault");
  if (!fs.existsSync(vaultDir)) {
    fs.mkdirSync(vaultDir, { recursive: true });
  }
  return vaultDir;
};

const buildVaultFilePath = (ext) => {
  const safeExt = ext.startsWith(".") ? ext : `.${ext}`;
  return path.join(
    getVaultDir(),
    `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`
  );
};

const pushClipboardHistory = (item) => {
  const history = galleryStore.get("clipboardHistory", []);
  const duplicate = history.find(
    (entry) => entry && entry.signature && entry.signature === item.signature
  );
  if (duplicate) return;
  history.unshift(item);
  galleryStore.set("clipboardHistory", history.slice(0, 400));
};

const broadcastClipboardItem = (item) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win && win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send("clipboard:item", item);
    }
  });
};

const captureClipboard = () => {
  try {
    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      const pngBuffer = image.toPNG();
      const signature = `img:${crypto
        .createHash("sha1")
        .update(pngBuffer)
        .digest("hex")}`;
      if (signature !== lastClipboardSignature) {
        lastClipboardSignature = signature;
        const filePath = buildVaultFilePath("png");
        fs.writeFileSync(filePath, pngBuffer);
        const item = {
          id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          signature,
          fileType: "image",
          filepath: filePath,
          displayName: path.basename(filePath),
          source: "clipboard",
          previewText: "",
          createdAt: new Date().toISOString(),
        };
        pushClipboardHistory(item);
        broadcastClipboardItem(item);
      }
      return;
    }

    const text = clipboard.readText();
    const normalized = (text || "").trim();
    if (!normalized) return;
    const signature = `txt:${crypto
      .createHash("sha1")
      .update(normalized)
      .digest("hex")}`;
    if (signature === lastClipboardSignature) return;
    lastClipboardSignature = signature;
    const filePath = buildVaultFilePath("txt");
    fs.writeFileSync(filePath, normalized, "utf8");
    const item = {
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      signature,
      fileType: "text",
      filepath: filePath,
      displayName: path.basename(filePath),
      source: "clipboard",
      previewText: normalized.slice(0, 280),
      createdAt: new Date().toISOString(),
    };
    pushClipboardHistory(item);
    broadcastClipboardItem(item);
  } catch (error) {
    console.warn("[DropPoint] Clipboard capture error", error);
  }
};

const startClipboardWatcher = () => {
  if (clipboardPollTimer) return;
  clipboardPollTimer = setInterval(captureClipboard, 900);
};

startClipboardWatcher();

/**
 * Assigns file icons according to type. If multiple files, use multifile icon.
 * @param {Array} fileList The collection of files currently dragged into the window
 * @return {String} Name of icon according to filetype
 */
let getFileTypeIcons = (fileList) => {
  if (!fileList || fileList.length === 0) {
    return icons.file;
  }

  let fileType;
  if (fileList.length <= 1) {
    fileType = fileList[0].fileType;
    if (fileType !== "application") {
      fileType = icons[fileType];
    } else {
      fileType = icons.file;
    }
  } else {
    fileType = icons.multifile;
  }
  return fileType;
};

/**
 * Returns list of file paths of all the files in filelist.
 * Necessary for startDrag API of electron
 *
 * @param {Array} fileList - List of files
 * @return {Array} List of paths of files in fileList
 */
let getFilePathList = (fileList) => {
  let filePathList = [];
  fileList.forEach((element) => {
    filePathList.push(element.filepath);
  });
  return filePathList;
};

/**
 * Activates Drag-and-Drop API of electron. Handles drag icon attributes.
 * Minimises instance after operation
 *
 * @param {Array} fileList - List of files
 */
let dragHandler = ipcMain.on("ondragstart", (event, params) => {
  const fileList = (params && params.filelist ? params.filelist : []).filter(
    (item) => item && item.filepath && fs.existsSync(item.filepath)
  );
  if (fileList.length === 0) {
    return;
  }

  console.log("Params - filelist: " + JSON.stringify(fileList.map((f) => f.filepath)));
  let fileTypeIcons = getFileTypeIcons(fileList) || icons.file;
  let filePathList = getFilePathList(fileList);

  let dragIcon = nativeImage.createFromPath(fileTypeIcons);
  if (dragIcon.isEmpty()) {
    dragIcon = nativeImage.createFromPath(icons.file);
  }

  try {
    event.sender.startDrag({
      files: filePathList,
      icon: dragIcon.isEmpty() ? nativeImage.createEmpty() : dragIcon.resize({ width: 64 }),
    });
  } catch (error) {
    console.error("[DropPoint] startDrag failed", error);
  }
  // addToInstanceHistory(params.instanceId, params.filelist);
});

/**
 * For minimising instance on clicking the button
 */
let minimiseHandler = ipcMain.on("minimise", (event) => {
  event.sender.send("close-signal");
});

/**
 * For printing custom debug log in development console rather than browser
 */
let debugPrint = ipcMain.on("debugPrint", (event, message) => {
  console.log("[*] Debug Print: ");
  console.log(message);
});

/**
 * Fetching config and schema
 */
let fetchConfig = ipcMain.on("fetchConfig", (event) => {
  const config = new Store(configOptions);
  const schema = configOptions.schema;
  event.sender.send(
    "configObj",
    JSON.stringify({
      config: config,
      schema: schema,
    })
  );
});

// For applying new settings
ipcMain.on("applySettings", (event, newSettings) => {
  const config = new Store(configOptions);
  console.log("Received new settings in main process");
  config.set(newSettings);
  console.log("Applied new settings in main process");
})


/**
 * Resizes the DropPoint window. Called when gallery opens/closes.
 * Clamps position to keep the window within the screen work area.
 */
ipcMain.on("resize-window", (event, { width, height }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  console.log(`[DropPoint] resize-window -> ${width}x${height}`);
  const { workArea } = screen.getPrimaryDisplay();
  const [curX, curY] = win.getPosition();
  const newX = Math.max(workArea.x, Math.min(curX, workArea.x + workArea.width  - width));
  const newY = Math.max(workArea.y, Math.min(curY, workArea.y + workArea.height - height));
  // win.setSize() is silently ignored on non-resizable windows, so we must
  // temporarily enable resizing, resize, then lock it back down.
  const wasResizable = win.isResizable();
  win.setResizable(true);
  win.setSize(width, height);
  win.setPosition(newX, newY);
  // Only re-lock if it was locked before (production mode).
  if (!wasResizable) win.setResizable(false);
  console.log(`[DropPoint] resize-window done. new size=${JSON.stringify(win.getSize())}`);
});

ipcMain.handle("gallery:get-zones", () => {
  return galleryStore.get("zones", []);
});

ipcMain.handle("clipboard:get-history", () => {
  return galleryStore.get("clipboardHistory", []);
});

ipcMain.handle("gallery:set-zones", (event, zones) => {
  galleryStore.set("zones", Array.isArray(zones) ? zones : []);
  return { ok: true };
});

ipcMain.handle("vault:save-text", (event, { text }) => {
  const filePath = buildVaultFilePath("txt");
  fs.writeFileSync(filePath, text || "", "utf8");
  return {
    filepath: filePath,
    fileType: "text",
    displayName: path.basename(filePath),
    source: "vault",
    previewText: (text || "").slice(0, 280),
  };
});

ipcMain.handle("vault:save-image", (event, { dataUrl }) => {
  if (!dataUrl || typeof dataUrl !== "string") {
    throw new Error("Invalid image data");
  }

  const payload = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const buffer = Buffer.from(payload, "base64");
  const filePath = buildVaultFilePath("png");
  fs.writeFileSync(filePath, buffer);

  return {
    filepath: filePath,
    fileType: "image",
    displayName: path.basename(filePath),
    source: "vault",
  };
});

ipcMain.handle("fs:file-exists", (event, { filepath }) => {
  return Boolean(filepath && fs.existsSync(filepath));
});

ipcMain.handle("fs:reveal-in-folder", (event, { filepath }) => {
  if (!filepath || !fs.existsSync(filepath)) {
    return { ok: false, reason: "missing" };
  }
  shell.showItemInFolder(filepath);
  return { ok: true };
});

module.exports = {
  dragHandler: dragHandler,
  minimiseHandler: minimiseHandler,
  debugPrint: debugPrint,
  fetchConfig: fetchConfig,
};
