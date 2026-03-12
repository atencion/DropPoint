const { contextBridge, ipcRenderer } = require("electron");
// const path = require("path");

contextBridge.exposeInMainWorld("electron", {
  getLatestInstanceId: () => {
    ipcRenderer.send("getLatestInstanceId");
  },
  dragOutListener: (params) => {
    ipcRenderer.send("ondragstart", params);
  },
  minimise: () => {
    ipcRenderer.send("minimise");
  },
  debugPrint: (message) => {
    ipcRenderer.send("debugPrint", message);
  },
  fetchConfig: () => {
    ipcRenderer.send("fetchConfig");
  },
  onConfigReceived: (callback) => {
    ipcRenderer.on("configObj", callback)
  },
  applySettingsInConfig: (newConfig) => {
    ipcRenderer.send("applySettings", newConfig)
  },
  resizeWindow: (width, height) => {
    ipcRenderer.send("resize-window", { width, height });
  },
  getGalleryZones: () => ipcRenderer.invoke("gallery:get-zones"),
  setGalleryZones: (zones) => ipcRenderer.invoke("gallery:set-zones", zones),
  saveClipboardText: (text) => ipcRenderer.invoke("vault:save-text", { text }),
  saveClipboardImage: (dataUrl) => ipcRenderer.invoke("vault:save-image", { dataUrl }),
  fileExists: (filepath) => ipcRenderer.invoke("fs:file-exists", { filepath }),
  spawnInstance: () => ipcRenderer.send("spawn-instance"),
  revealInFolder: (filepath) => ipcRenderer.invoke("fs:reveal-in-folder", { filepath }),
  getClipboardHistory: () => ipcRenderer.invoke("clipboard:get-history"),
  onClipboardItem: (callback) => ipcRenderer.on("clipboard:item", (event, item) => callback(item)),
});

// For settings renderer
let configObj;
const updateConfigObj = (config) => {
  configObj = config;
  console.log(configObj);
};

ipcRenderer.on("configObj", (event, config) => {
  configObj = JSON.parse(config);
  const configFileContents = require(configObj.config.path);
  console.log(configFileContents);
  ipcRenderer.sendToHost(config);
  return configFileContents;
});

ipcRenderer.on("close-signal", (event) => {
  window.close();
});
ipcRenderer.on("history-instance", (event, filelist) => { });

console.log("preload");
