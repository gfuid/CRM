/**
 * Help video library.
 * The platform admin adds "how to" videos (a link to YouTube, Vimeo, Google Drive or an .mp4 file);
 * every owner and staff member can search and watch them in Help & Support.
 * Only the link and its description are stored here, never the video file itself.
 */
const ApiResponse = require('../utils/apiResponse');
const { dataStore, generateId, dbSync } = require('../repositories/dataStore');
const { isOwnerUser, isSuperAdmin } = require('../utils/access');

const STORE_ID = 'help_videos';
const MAX_VIDEOS = 300;
const SECTIONS = [
  'Getting started', 'Leads', 'Bulk Import', 'Follow up', 'Task Management', 'Activity', 'Outreach', 'My Days',
  'Analytics', 'Team Review', 'Staff & storage', 'Email Marketing', 'Help & tickets', 'Login & account', 'Other',
];
const AUDIENCES = ['everyone', 'owners'];

const str = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

const readAll = () => {
  const row = (dataStore.appSettings || []).find((s) => s.id === STORE_ID);
  return row && Array.isArray(row.videos) ? row.videos : [];
};
const writeAll = (videos) => {
  const list = dataStore.appSettings || (dataStore.appSettings = []);
  const next = { id: STORE_ID, kind: 'help_videos', videos, updated_at: new Date().toISOString() };
  const idx = list.findIndex((s) => s.id === STORE_ID);
  if (idx >= 0) list[idx] = next; else list.push(next);
  dbSync.saveAppSetting(next);
};
const sorted = (videos) =>
  [...videos].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.created_at).localeCompare(String(b.created_at)));

/** Only real web links are accepted (no javascript:, data:, file: ...). */
const cleanUrl = (value) => {
  const raw = str(value, 1000);
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch {
    return '';
  }
};

/** Validate one video from the admin form. Returns { error } or { video }. */
const fromBody = (body, current = {}) => {
  const title = body.title !== undefined ? str(body.title, 140) : current.title;
  if (!title) return { error: 'Video title is required' };
  const url = body.url !== undefined ? cleanUrl(body.url) : current.url;
  if (!url) return { error: 'Please paste a valid video link (it must start with https://)' };
  const section = body.section !== undefined ? str(body.section, 60) : current.section;
  if (!SECTIONS.includes(section)) return { error: `Section must be one of: ${SECTIONS.join(', ')}` };
  const audience = body.audience !== undefined ? str(body.audience, 20) : (current.audience || 'everyone');
  if (!AUDIENCES.includes(audience)) return { error: 'Audience must be "everyone" or "owners"' };
  const keywordsIn = body.keywords !== undefined ? body.keywords : current.keywords;
  const keywords = (Array.isArray(keywordsIn) ? keywordsIn : String(keywordsIn || '').split(','))
    .map((k) => str(String(k), 40).toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
  return {
    video: {
      title,
      url,
      section,
      audience,
      description: body.description !== undefined ? str(body.description, 600) : (current.description || ''),
      keywords,
      duration: body.duration !== undefined ? str(body.duration, 12) : (current.duration || ''),
      order: body.order !== undefined ? (Number(body.order) || 0) : (Number(current.order) || 0),
    },
  };
};

/** Everyone signed in: the videos they may watch (staff do not get owner-only videos). */
const listForUsers = async (req, res) => {
  const ownerLike = isOwnerUser(req.user) || isSuperAdmin(req.user);
  const videos = sorted(readAll()).filter((v) => ownerLike || v.audience !== 'owners');
  return ApiResponse.success(res, videos, 'Help videos', 200, { total: videos.length, sections: SECTIONS });
};

/** Platform admin: the full list plus the allowed sections. */
const listForAdmin = async (req, res) =>
  ApiResponse.success(res, sorted(readAll()), 'Help videos', 200, { sections: SECTIONS, audiences: AUDIENCES, max: MAX_VIDEOS });

const createVideo = async (req, res) => {
  const videos = readAll();
  if (videos.length >= MAX_VIDEOS) return ApiResponse.error(res, `You can keep at most ${MAX_VIDEOS} videos. Delete an old one first.`, 400);
  const { error, video } = fromBody(req.body || {});
  if (error) return ApiResponse.error(res, error, 400);
  const now = new Date().toISOString();
  const created = { id: generateId('vid'), ...video, created_at: now, updated_at: now };
  writeAll([...videos, created]);
  return ApiResponse.created(res, created, 'Video added');
};

const updateVideo = async (req, res) => {
  const videos = readAll();
  const idx = videos.findIndex((v) => v.id === req.params.id);
  if (idx < 0) return ApiResponse.error(res, 'Video not found', 404);
  const { error, video } = fromBody(req.body || {}, videos[idx]);
  if (error) return ApiResponse.error(res, error, 400);
  const updated = { ...videos[idx], ...video, updated_at: new Date().toISOString() };
  const next = [...videos];
  next[idx] = updated;
  writeAll(next);
  return ApiResponse.success(res, updated, 'Video updated');
};

const deleteVideo = async (req, res) => {
  const videos = readAll();
  const target = videos.find((v) => v.id === req.params.id);
  if (!target) return ApiResponse.error(res, 'Video not found', 404);
  writeAll(videos.filter((v) => v.id !== req.params.id));
  return ApiResponse.success(res, target, 'Video deleted');
};

module.exports = { SECTIONS, listForUsers, listForAdmin, createVideo, updateVideo, deleteVideo };
