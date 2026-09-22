const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    itemType: {
      type: String,
      enum: ['MOVIE', 'EVENT'],
      default: 'MOVIE'
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie'
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    title: {
      type: String,
      trim: true,
      default: ''
    },
    comment: {
      type: String,
      required: true,
      trim: true
    },
    isVerifiedBooking: {
      type: Boolean,
      default: false
    },
    likes: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['APPROVED', 'FLAGGED', 'REMOVED'],
      default: 'APPROVED'
    }
  },
  {
    timestamps: true
  }
);

reviewSchema.index({ movie: 1, createdAt: -1 });
reviewSchema.index({ event: 1, createdAt: -1 });
reviewSchema.index({ user: 1 });

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
