/**
 * Profile photo rules shared by every endpoint that saves `avatar_url`.
 * Allowed: empty, an https:// link, one of the built-in 3D avatars (/avatars/NN-name.png)
 * or a photo uploaded to this server (/api/v1/avatars/av_<24 hex>).
 */
const PRESET_RE = /^\/avatars\/[a-z0-9-]{1,60}\.png$/;
const UPLOAD_RE = /^\/api\/v1\/avatars\/(av_[a-f0-9]{24})$/;

const isValidAvatarUrl = (value) => {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string' || value.length > 2048) return false;
  return /^https:\/\//i.test(value) || PRESET_RE.test(value) || UPLOAD_RE.test(value);
};

const uploadedAvatarId = (value) => {
  const m = typeof value === 'string' ? value.match(UPLOAD_RE) : null;
  return m ? m[1] : null;
};

const AVATAR_URL_MESSAGE = 'Profile photo must be one of the built-in avatars, an uploaded photo, or an https:// link (max 2048 characters).';

module.exports = { isValidAvatarUrl, uploadedAvatarId, AVATAR_URL_MESSAGE };
