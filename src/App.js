const { app, BrowserWindow, nativeImage, ipcMain, globalShortcut } = require("electron");
const fs = require("fs");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const Store = require("electron-store");
const configOptions = require("./configOptions");

const { Instance } = require("./Window");
const { setShortcut } = require("./Shortcut");
const { droppointDefaultIcon } = require("./Icons");
const { setTray } = require("./Tray");

const config = new Store(configOptions);
let splashScreen;

try {
  const sessionDataPath = path.join(app.getPath("userData"), "sessionData");
  const diskCachePath = path.join(sessionDataPath, "Cache");
  fs.mkdirSync(diskCachePath, { recursive: true });
  app.setPath("sessionData", sessionDataPath);
  app.commandLine.appendSwitch("disk-cache-dir", diskCachePath);
  app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
} catch (error) {
  console.warn("[DropPoint] Failed to configure session cache path", error);
}

app
  .on("ready", () => {
    // Splash screen which also helps to run in background and keep app alive
    splashScreen = new BrowserWindow({
      width: 400,
      height: 200,
      frame: false,
      titleBarStyle: "hidden",
      fullscreenable: false,
      transparent: true,
      icon: nativeImage.createFromPath(droppointDefaultIcon),
      show: false,
    });
    // splashScreen.loadFile(path.join(__dirname, "../static/media/splash.jpeg"));
    // splashScreen.removeMenu();
    // setTimeout(() => {
    //   splashScreen.hide();
    // }, 3000);

    setTray();
    setShortcut();

    ipcMain.on("spawn-instance", () => {
      const instance = new Instance();
      instance.createNewWindow();
    });

    if (BrowserWindow.getAllWindows.length === 0 && config.get("spawnOnLaunch")) {
      const instance = new Instance();
      const instanceID = instance.createNewWindow();
      if (instanceID !== null) {
      }
    }
  })
  // .on("activate", () => {
  //   autoUpdater.checkForUpdatesAndNotify();
  //   if (BrowserWindow.getAllWindows.length === 0) {
  //     createMainWindow();
  //   }
  // })
  .on("before-quit", () => {
    splashScreen.close();
  })
  .on("will-quit", () => {
    globalShortcut.unregisterAll();
  });
module.exports = {
  whenReady: app.whenReady,
};
