const { globalShortcut, app, webContents } = require("electron");
const { Instance } = require("./Window");
const Store = require("electron-store");
const configOptions = require("./configOptions");

const FALLBACK_SHORTCUT = "CommandOrControl+Shift+Space";

/**
 * Sets Shift + Caps Lock as Shortcut. Change to convenience
 */
const setShortcut = () => {
  let shortcut = "Shift+CapsLock";

  const onShortcut = () => {
    const active_instances = webContents.getAllWebContents();
    const config = new Store(configOptions);

    console.log("Active Instances: " + active_instances);
    if (config.get("shortcutAction") === "toggle") {
      if (active_instances.length === 1) {
        const instance = new Instance();
        if (instance.createNewWindow() !== null) {
          console.log("New Window created");
        }
      } else {
        active_instances[0].send("close-signal");
      }
    } else {
      const instance = new Instance();
      if (instance.createNewWindow() !== null) {
        console.log("New Window created");
      }
    }
  };

  const tryRegisterShortcut = (accelerator) => {
    if (globalShortcut.isRegistered(accelerator)) {
      console.warn(`[DropPoint] Shortcut already registered: ${accelerator}`);
      return true;
    }

    const registered = globalShortcut.register(accelerator, onShortcut);
    if (!registered) {
      console.error(`[DropPoint] KeyboardShortcutError: failed to register ${accelerator}`);
      return false;
    }

    console.log(`[DropPoint] Shortcut registered: ${accelerator}`);
    return true;
  };

  if (process.platform === "darwin") {
    //caps lock is not a modifier in mac
    shortcut = "Shift+Tab";

    //handle macos cmd q quitting
    if (!globalShortcut.register("Cmd+Q", () => app.exit())) {
      console.error("[DropPoint] KeyboardShortcutError: failed to register Cmd+Q");
    }
  }

  if (!tryRegisterShortcut(shortcut)) {
    if (shortcut !== FALLBACK_SHORTCUT) {
      console.warn(
        `[DropPoint] Trying fallback shortcut: ${FALLBACK_SHORTCUT}`
      );
      tryRegisterShortcut(FALLBACK_SHORTCUT);
    }
  }
};

module.exports = {
  setShortcut: setShortcut,
};
