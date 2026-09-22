const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Movie title is required'],
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    poster: {
      type: String,
      required: [true, 'Movie poster is required']
    },
    banner: {
      type: String,
      required: [true, 'Movie banner is required']
    },
    description: {
      type: String,
      required: true
    },
    genres: {
      type: [String],
      required: true,
      default: []
    },
    languages: {
      type: [String],
      required: true,
      default: ['Hindi', 'English']
    },
    duration: {
      type: Number, // in minutes
      required: true
    },
    releaseDate: {
      type: Date,
      required: true
    },
    trailerUrl: {
      type: String,
      default: ''
    },
    cast: [
      {
        name: { type: String, required: true },
        role: String,
        photo: String
      }
    ],
    crew: [
      {
        name: { type: String, required: true },
        role: String
      }
    ],
    ageRating: {
      type: String,
      enum: ['U', 'UA', 'UA 13+', 'UA 16+', 'A', 'R', 'PG-13'],
      default: 'UA'
    },
    formats: {
      type: [String],
      default: ['2D', '3D', 'IMAX 3D', '4DX']
    },
    rating: {
      type: Number,
      default: 8.5,
      min: 0,
      max: 10
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['NOW_SHOWING', 'UPCOMING', 'ENDED'],
      default: 'NOW_SHOWING'
    },
    isTrending: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

movieSchema.index({ status: 1 });
movieSchema.index({ genres: 1 });
movieSchema.index({ languages: 1 });
movieSchema.index({ isTrending: 1 });
movieSchema.index({ title: 'text', description: 'text' });

const Movie = mongoose.model('Movie', movieSchema);
module.exports = Movie;
