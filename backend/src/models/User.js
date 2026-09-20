const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'manager', 'agent'], default: 'agent' },
    persona: { type: String, enum: ['owner', 'staff'], default: 'staff' },
    department: { type: String, default: 'Sales' },
    phone: { type: String, default: '' },
    is_active: { type: Boolean, default: true },
    avatar_url: { type: String, default: '' },
    last_login: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare candidate password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
