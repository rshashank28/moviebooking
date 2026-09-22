const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Venue name is required'],
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    city: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    postalCode: String,
    location: {
      lat: Number,
      lng: Number
    },
    amenities: {
      type: [String],
      default: ['Parking', 'Food Court', 'Wheelchair Accessible', 'M-Ticket', 'Dolby Atmos']
    },
    contactPhone: String,
    contactEmail: String,
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

venueSchema.index({ city: 1 });
venueSchema.index({ status: 1 });

const Venue = mongoose.model('Venue', venueSchema);
module.exports = Venue;
