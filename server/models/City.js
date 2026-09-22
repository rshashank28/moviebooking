const mongoose = require('mongoose');

const citySchema = new mongoose.Schema(
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
    state: {
      type: String,
      required: true
    },
    country: {
      type: String,
      default: 'India'
    },
    isPopular: {
      type: Boolean,
      default: false
    },
    coordinates: {
      lat: Number,
      lng: Number
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

citySchema.index({ isPopular: 1 });
citySchema.index({ isActive: 1 });

const City = mongoose.model('City', citySchema);
module.exports = City;
