const mongoose = require('mongoose');

/** A profile photo uploaded by an owner or staff member (small WebP/JPEG/PNG kept in the database, so it survives redeploys). */
const avatarSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    owner_id: { type: String, default: '', index: true },
    user_id: { type: String, default: '', index: true },
    mime: { type: String, default: 'image/webp' },
    data: { type: String, default: '' }, // base64
    bytes: { type: Number, default: 0 },
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  { versionKey: false }
);

module.exports = mongoose.model('Avatar', avatarSchema);
