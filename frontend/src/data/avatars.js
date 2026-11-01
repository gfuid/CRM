import { api } from '../services/api';

/**
 * Built-in 3D avatars (Microsoft Fluent Emoji 3D, MIT licence) served from /public/avatars,
 * so they always load, even when outside image sites are blocked.
 */
export const AVATAR_PRESETS = [
  { url: '/avatars/01-man-office-worker.png', label: 'Man office worker' },
  { url: '/avatars/02-woman-office-worker.png', label: 'Woman office worker' },
  { url: '/avatars/03-man-technologist.png', label: 'Man technologist' },
  { url: '/avatars/04-woman-technologist.png', label: 'Woman technologist' },
  { url: '/avatars/05-man-beard.png', label: 'Man beard' },
  { url: '/avatars/06-woman-curly-hair.png', label: 'Woman curly hair' },
  { url: '/avatars/07-man-wearing-turban.png', label: 'Man wearing turban' },
  { url: '/avatars/08-woman-with-headscarf.png', label: 'Woman with headscarf' },
  { url: '/avatars/09-man-white-hair.png', label: 'Man white hair' },
  { url: '/avatars/10-woman-white-hair.png', label: 'Woman white hair' },
  { url: '/avatars/11-man-in-tuxedo.png', label: 'Man in tuxedo' },
  { url: '/avatars/12-woman-red-hair.png', label: 'Woman red hair' },
];
export const PRESET_AVATARS = AVATAR_PRESETS.map((a) => a.url);
export const DEFAULT_AVATAR = PRESET_AVATARS[0];

const apiOrigin = () => String(api?.baseUrl || '').replace(/\/api\/v1\/?$/, '');

// Old photo links pointed at images.unsplash.com, which often fails to load: show a built-in avatar instead.
const LEGACY = /images\.unsplash\.com/i;
const pick = (seed) => {
  const s = String(seed || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PRESET_AVATARS[h % PRESET_AVATARS.length];
};

/** Turns a saved avatar_url into something an <img> can load (uploaded photos live on the API server). */
export const avatarSrc = (url, seed = '') => {
  if (!url) return '';
  if (url.startsWith('/api/v1/avatars/')) return apiOrigin() + url;
  if (LEGACY.test(url)) return pick(seed || url);
  return url;
};

/** onError handler: swap a broken photo for a built-in avatar (only once). */
export const avatarFallback = (e) => {
  const img = e.currentTarget;
  if (img.dataset.fallback) return;
  img.dataset.fallback = '1';
  img.src = DEFAULT_AVATAR;
};

const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This file could not be read as an image.')); };
  img.src = url;
});

/** Crops the photo to a square, shrinks it to 160×160 and compresses it (≈5–15 KB). */
export const fileToAvatarDataUrl = async (file) => {
  if (!file || !/^image\//.test(file.type)) throw new Error('Please choose an image file (JPG, PNG or WebP).');
  if (file.size > 15 * 1024 * 1024) throw new Error('This image is larger than 15 MB. Please choose a smaller one.');
  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 160, 160);
  ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 160, 160);
  for (const q of [0.85, 0.75, 0.65, 0.5, 0.4]) {
    let out = canvas.toDataURL('image/webp', q);
    if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/jpeg', q); // older Safari
    if (out.length < 19000) return out;
  }
  throw new Error('This photo could not be made small enough. Please try another one.');
};

/** Uploads a photo and returns the avatar_url to save on the user. */
export const uploadAvatarFile = async (file) => {
  const dataUrl = await fileToAvatarDataUrl(file);
  const res = await api.uploadAvatar(dataUrl);
  const url = res?.data?.url;
  if (!url) throw new Error(res?.message || 'Upload failed. Please try again.');
  return url;
};
