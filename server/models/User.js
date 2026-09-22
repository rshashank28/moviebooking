const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Exclude from default queries
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    role: {
      type: String,
      enum: ['CUSTOMER', 'ORGANIZER', 'ADMIN'],
      default: 'CUSTOMER'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED'],
      default: 'ACTIVE'
    },
    isEmailVerified: {
      type: Boolean,
      default: true // Dev default; in production verified via token
    },
    emailVerificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    avatar: {
      type: String,
      default: ''
    },
    loyaltyPoints: {
      type: Number,
      default: 100 // Welcome points bonus
    },
    loyaltyTier: {
      type: String,
      enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'],
      default: 'BRONZE'
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    preferences: {
      preferredCity: {
        type: String,
        default: 'Patna'
      },
      favoriteGenres: [String],
      favoriteLanguages: [String]
    }
  },
  {
    timestamps: true
  }
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

// Pre-save password hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Auto-generate referral code if missing
    if (!this.referralCode) {
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      this.referralCode = `SP${randomStr}`;
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Compare Password helper
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe JSON serialization
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
