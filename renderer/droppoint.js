const instanceId = parseInt(window.location.search.slice(4), 10);

let filelist = [];
const subscribers = new Set();
let currentClipFolderId = "clip-root";

const holder = document.getElementById("droppoint");

function normalizeType(type, filePath) {
  const lower = (filePath || "").toLowerCase();
  const base = fileNameFromPath(filePath || "");
  const hasExt = base.includes(".");

  if (!type && !hasExt) return "folder";
  if (type && type !== "application") return type;
  if (/(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.bmp|\.svg)$/.test(lower)) return "image";
  if (/(\.txt|\.md|\.csv|\.json|\.js|\.ts|\.tsx|\.jsx|\.html|\.css|\.xml|\.yml|\.yaml)$/.test(lower)) return "text";
  if (/(\.mp4|\.mov|\.mkv|\.avi|\.webm)$/.test(lower)) return "video";
  if (/(\.mp3|\.wav|\.ogg|\.flac|\.aac)$/.test(lower)) return "audio";
  return "file";
}

function fileNameFromPath(filePath) {
  return (filePath || "").replace(/\\/g, "/").split("/").pop() || filePath;
}

function notifyChange() {
  const snapshot = filelist.map((item) => ({ ...item }));
  subscribers.forEach((fn) => {
    try {
      fn(snapshot);
    } catch (error) {
      console.warn("[DropPoint] file subscriber error", error);
    }
  });
}

function addItems(items) {
  let changed = false;
  items.forEach((raw) => {
    if (!raw || !raw.filepath) return;
    const duplicate = filelist.some((item) => item.filepath === raw.filepath);
    if (duplicate) return;

    const item = {
      id: raw.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      filepath: raw.filepath,
      fileType: normalizeType(raw.fileType, raw.filepath),
      displayName: raw.displayName || fileNameFromPath(raw.filepath),
      source: raw.source || "reference",
      createdAt: raw.createdAt || new Date().toISOString(),
      previewText: raw.previewText || "",
      parentClipFolderId: raw.parentClipFolderId || currentClipFolderId,
    };

    filelist.push(item);
    changed = true;
  });

  if (changed) notifyChange();
}

function clearItems() {
  filelist = [];
  notifyChange();
}

function replaceItems(items) {
  filelist = [];
  addItems(items || []);
}

function startDragOut(itemsToDrag) {
  const dragItems = (itemsToDrag && itemsToDrag.length ? itemsToDrag : filelist).filter(
    (item) => item && item.filepath
  );
  if (!dragItems.length) return;

  window.electron.dragOutListener({
    filelist: dragItems,
    instanceId,
  });
}

holder.ondragover = (event) => {
  event.preventDefault();
  event.stopPropagation();
  holder.setAttribute("class", "dragged");
  return false;
};

holder.ondragenter = (event) => {
  event.preventDefault();
  event.stopPropagation();
  holder.setAttribute("class", "dragged");
  return false;
};

holder.ondragleave = (event) => {
  event.preventDefault();
  event.stopPropagation();
  holder.removeAttribute("class");
  return false;
};

holder.ondrop = (event) => {
  event.preventDefault();
  holder.removeAttribute("class");

  const dropped = [];
  for (const f of event.dataTransfer.files) {
    dropped.push({
      filepath: f.path.toString(),
      fileType: normalizeType(f.type.split("/")[0], f.path.toString()),
      displayName: f.name,
      source: "reference",
    });
  }

  addItems(dropped);
  return false;
};

const dragAllHandle = document.getElementById("drag");
if (dragAllHandle) {
  dragAllHandle.ondragstart = (event) => {
    startDragOut();
  };
}

window.droppoint = {
  getFiles: () => filelist.map((item) => ({ ...item })),
  addItems,
  replaceItems,
  clearItems,
  startDragOut,
  setCurrentClipFolderId: (folderId) => {
    currentClipFolderId = folderId || "clip-root";
  },
  subscribe: (callback) => {
    subscribers.add(callback);
    callback(filelist.map((item) => ({ ...item })));
    return () => subscribers.delete(callback);
  },
};
