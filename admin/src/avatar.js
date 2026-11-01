// Profile photos in the admin console: built-in 3D avatars (copied to /public/avatars),
// photos uploaded to the API server, or old outside links (shown with a built-in avatar if they fail).
const isLocal = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_ORIGIN = isLocal
  ? 'http://localhost:5000'
  : String(import.meta.env.VITE_API_URL || 'https://crm-ep4i.onrender.com/api/v1').replace(/\/api\/v1\/?$/, '');

export const DEFAULT_AVATAR = '/avatars/01-man-office-worker.png';

export const avatarSrc = (url, name = '') => {
  if (!url || /images\.unsplash\.com/i.test(url)) {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}`;
  }
  if (url.startsWith('/api/v1/avatars/')) return API_ORIGIN + url;
  return url;
};

export const avatarFallback = (e) => {
  const img = e.currentTarget;
  if (img.dataset.fallback) return;
  img.dataset.fallback = '1';
  img.src = DEFAULT_AVATAR;
};
