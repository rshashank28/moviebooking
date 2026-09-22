const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['MOVIE_GENRE', 'EVENT_CATEGORY', 'EXPERIENCE'],
      required: true
    },
    icon: {
      type: String,
      default: 'Sparkles'
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

categorySchema.index({ type: 1 });
categorySchema.index({ isActive: 1 });

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
