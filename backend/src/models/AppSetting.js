const mongoose = require('mongoose');

/** Platform-wide settings (e.g. the AI assistant). Secrets are stored encrypted. */
const appSettingSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
  },
  { strict: false, timestamps: true }
);

module.exports = mongoose.model('AppSetting', appSettingSchema);
