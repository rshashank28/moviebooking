const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    category: {
      type: String,
      required: true,
      enum: ['CONCERTS', 'STANDUP_COMEDY', 'SPORTS', 'THEATRE', 'WORKSHOPS', 'MEETUPS', 'OTHER'],
      default: 'CONCERTS'
    },
    artist: {
      type: String,
      default: ''
    },
    venueName: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      default: ''
    },
    ticketCategories: [
      {
        name: { type: String, required: true }, // e.g. Early Bird, Silver, Gold, VIP Phase 1
        price: { type: Number, required: true },
        capacity: { type: Number, required: true },
        soldCount: { type: Number, default: 0 },
        description: String
      }
    ],
    capacity: {
      type: Number,
      required: true
    },
    poster: {
      type: String,
      required: true
    },
    banner: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    terms: [String],
    cancellationPolicy: {
      isAllowed: { type: Boolean, default: true },
      cutoffHours: { type: Number, default: 24 }, // e.g. 24 hours before event
      refundPercentage: { type: Number, default: 80 }
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'SOLD_OUT', 'COMPLETED', 'CANCELLED'],
      default: 'PUBLISHED'
    },
    isTrending: {
      type: Boolean,
      default: false
    },
    isFeatured: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

eventSchema.index({ city: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ date: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ isTrending: 1 });
eventSchema.index({ title: 'text', description: 'text', artist: 'text' });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
