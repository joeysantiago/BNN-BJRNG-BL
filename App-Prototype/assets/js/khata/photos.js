/* SnapKhata: Photos. Moved from thakurg.html as it was; see App-Prototype/README.md for the page layout. */
'use strict';

// #region Photos (IndexedDB in this browser; the real app keeps them in the owner's Drive or App-Data)

const PHOTO_DB = { db: null, mem: new Map(), urls: new Map() };
const newPhotoId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function photoDb() {
  if (!PHOTO_DB.db)
    PHOTO_DB.db = new Promise((resolve) => {
      try {
        const req = indexedDB.open('thakurg-proto-khata', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('photos');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  return PHOTO_DB.db;
}

async function photoPut(id, blob) {
  PHOTO_DB.mem.set(id, blob);
  const db = await photoDb();
  if (!db)
    return;
  await new Promise((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').put(blob, id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function photoGet(id) {
  if (PHOTO_DB.mem.has(id))
    return PHOTO_DB.mem.get(id);
  const db = await photoDb();
  if (!db)
    return null;
  return new Promise((resolve) => {
    const req = db.transaction('photos').objectStore('photos').get(id);
    req.onsuccess = () => {
      if (req.result)
        PHOTO_DB.mem.set(id, req.result);
      resolve(req.result || null);
    };
    req.onerror = () => resolve(null);
  });
}

async function photoClear() {
  PHOTO_DB.urls.forEach((u) => URL.revokeObjectURL(u));
  PHOTO_DB.urls.clear();
  PHOTO_DB.mem.clear();
  const db = await photoDb();
  if (db)
    db.transaction('photos', 'readwrite').objectStore('photos').clear();
}

async function photoUrl(id) {
  if (PHOTO_DB.urls.has(id))
    return PHOTO_DB.urls.get(id);
  const blob = await photoGet(id);
  if (!blob)
    return null;
  const url = URL.createObjectURL(blob);
  PHOTO_DB.urls.set(id, url);
  return url;
}

/** Stored photos are drawn as <img data-photo>; this fills in their address once the file is read. */
function hydratePhotos() {
  document.querySelectorAll('.khata img[data-photo]').forEach(async (img) => {
    const url = await photoUrl(img.dataset.photo);
    if (url && img.isConnected)
      img.src = url;
    else if (!url)
      img.alt = traw('khata.ph.missing');
  });
}

function decodeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });
}

/** Like the real app: at most 1600 px, WebP (JPEG where WebP can't be written) at about 0.75 quality; drawing on a canvas also drops EXIF such as location. */
async function compressPhoto(file) {
  let src;
  try {
    src = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    src = await decodeImage(file);
  }
  const scale = Math.min(1, PHOTO_EDGE / Math.max(src.width, src.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(src.width * scale));
  c.height = Math.max(1, Math.round(src.height * scale));
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(src, 0, 0, c.width, c.height);
  const webp = await new Promise((r) => c.toBlob(r, 'image/webp', 0.75));
  if (webp && webp.type === 'image/webp')
    return webp;
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.78));
}

const fileSize = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// #endregion

