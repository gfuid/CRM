const crypto = require('crypto');
const { dataStore, dbSync } = require('../repositories/dataStore');
const ApiResponse = require('../utils/apiResponse');
const { ownerOf } = require('../utils/usage');
const { uploadedAvatarId } = require('../utils/avatar');

const MAX_BYTES = 100 * 1024; // the app sends ~10 KB (160×160 WebP); this is a hard ceiling
const MAX_PER_COMPANY = 300;
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

const SIGNATURES = {
  'image/png': (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/jpeg': (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/webp': (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
};

/** Uploaded photos of this company that no user uses any more (older than a day) are removed. */
const pruneOrphans = (ownerId) => {
  const inUse = new Set(dataStore.users.map((u) => uploadedAvatarId(u.avatar_url)).filter(Boolean));
  const now = Date.now();
  const drop = (dataStore.avatars || [])
    .filter((a) => a.owner_id === ownerId && !inUse.has(a.id) && now - Date.parse(a.created_at || 0) > ORPHAN_AGE_MS)
    .map((a) => a.id);
  if (drop.length) {
    const gone = new Set(drop);
    dataStore.avatars = dataStore.avatars.filter((a) => !gone.has(a.id));
    dbSync.deleteAvatars(drop);
  }
};

/** POST /api/v1/avatars  { data_url: "data:image/webp;base64,..." } → { url } */
const uploadAvatar = async (req, res) => {
  const raw = req.body && req.body.data_url;
  const m = typeof raw === 'string' ? raw.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/) : null;
  if (!m) return ApiResponse.error(res, 'Please choose a PNG, JPG or WebP image.', 400);
  const mime = m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length || buf.length > MAX_BYTES) return ApiResponse.error(res, 'This photo is too large. Please choose a smaller image.', 413);
  if (!SIGNATURES[mime](buf)) return ApiResponse.error(res, 'This file is not a valid image.', 400);

  const owner = ownerOf(req.user);
  const ownerId = owner ? owner.id : req.user.id;
  dataStore.avatars = dataStore.avatars || [];
  pruneOrphans(ownerId);
  if (dataStore.avatars.filter((a) => a.owner_id === ownerId).length >= MAX_PER_COMPANY) {
    return ApiResponse.error(res, 'Too many uploaded photos for this company. Remove unused ones or choose a built-in avatar.', 400);
  }

  const avatar = {
    id: `av_${crypto.randomBytes(12).toString('hex')}`,
    owner_id: ownerId,
    user_id: req.user.id,
    mime,
    data: buf.toString('base64'),
    bytes: buf.length,
    created_at: new Date().toISOString(),
  };
  dataStore.avatars.push(avatar);
  await dbSync.saveAvatar(avatar);
  return ApiResponse.success(res, { id: avatar.id, url: `/api/v1/avatars/${avatar.id}` }, 'Photo uploaded', 201);
};

/** GET /api/v1/avatars/:id — public (an <img> cannot send a login token); ids are random and unguessable. */
const getAvatar = (req, res) => {
  const id = String(req.params.id || '');
  if (!/^av_[a-f0-9]{24}$/.test(id)) return res.status(404).end();
  const a = (dataStore.avatars || []).find((x) => x.id === id);
  if (!a) return res.status(404).end();
  const buf = Buffer.from(a.data, 'base64');
  res.set({
    'Content-Type': a.mime,
    'Content-Length': buf.length,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'",
  });
  return res.end(buf);
};

module.exports = { uploadAvatar, getAvatar };
