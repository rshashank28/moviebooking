const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    itemType: {
      type: String,
      enum: ['MOVIE', 'EVENT'],
      required: true
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie'
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    }
  },
  {
    timestamps: true
  }
);

wishlistSchema.index({ user: 1, movie: 1 }, { unique: true, sparse: true });
wishlistSchema.index({ user: 1, event: 1 }, { unique: true, sparse: true });
wishlistSchema.index({ user: 1, createdAt: -1 });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);
module.exports = Wishlist;
